import crypto from "node:crypto";

const UNTRACKED_REQUEST_GRACE_MS = 90_000;

function requestError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

async function arrJson({ baseUrl, apiKey, path, method = "GET", body, fetchImpl = fetch }) {
  const res = await fetchImpl(`${baseUrl.replace(/\/$/, "")}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": apiKey
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw requestError(502, "upstream_unavailable", `${method} ${path} failed: ${res.status} ${text}`.trim());
  }
  if (res.status === 204) return null;
  return res.json();
}

function startOfTodayIso() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function queueRecords(payload) {
  if (Array.isArray(payload?.records)) return payload.records;
  return Array.isArray(payload) ? payload : [];
}

function queueProgress(item) {
  if (typeof item?.progress === "number") return Math.max(0, Math.min(100, Math.round(item.progress)));
  const size = Number(item?.size || 0);
  const sizeLeft = Number(item?.sizeleft ?? item?.sizeLeft ?? 0);
  if (size <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round(((size - sizeLeft) / size) * 100)));
}

function queueError(item) {
  const state = [item?.status, item?.trackedDownloadStatus, item?.trackedDownloadState].filter(Boolean).join(" ").toLowerCase();
  if (!/(error|failed)/.test(state)) return null;
  const messages = (item?.statusMessages || []).flatMap((entry) => entry.messages || entry.message || []).filter(Boolean);
  return messages.join(" · ") || "Radarr báo lỗi khi tải phim";
}

function releaseRejectionMessage(rejection) {
  if (typeof rejection === "string") return rejection;
  return rejection?.reason || rejection?.message || rejection?.type || null;
}

function rejectedReleaseDecision(payload) {
  const decision = Array.isArray(payload) ? payload[0] : payload;
  if (!decision || typeof decision !== "object") return null;
  const reasons = (Array.isArray(decision.rejections) ? decision.rejections : [])
    .map(releaseRejectionMessage)
    .filter(Boolean);
  if (decision.rejected === true || decision.approved === false || reasons.length > 0) {
    return reasons.join(" · ") || "Radarr từ chối nguồn tải đã chọn";
  }
  return null;
}

export function createRequestService({ db, config, discover, fetchImpl = fetch, now = () => Date.now() }) {
  async function listQualityProfiles(type = "movie") {
    const target = type === "series" ? config.sonarr : config.radarr;
    const rows = await arrJson({ ...target, path: "/api/v3/qualityprofile", fetchImpl });
    return rows.map((profile) => ({ id: profile.id, name: profile.name }));
  }

  async function findExistingMovie(tmdbId) {
    const rows = await arrJson({ ...config.radarr, path: `/api/v3/movie?tmdbId=${encodeURIComponent(tmdbId)}`, fetchImpl });
    const movies = Array.isArray(rows) ? rows : [rows].filter(Boolean);
    return movies.find((movie) => Number(movie.tmdbId) === Number(tmdbId)) || null;
  }

  async function ensureMovieDownloadReady() {
    const [indexers, downloadClients] = await Promise.all([
      arrJson({ ...config.radarr, path: "/api/v3/indexer", fetchImpl }),
      arrJson({ ...config.radarr, path: "/api/v3/downloadclient", fetchImpl })
    ]);
    const automaticIndexers = indexers.filter((indexer) => indexer.enableAutomaticSearch !== false && indexer.enable !== false);
    if (automaticIndexers.length === 0) {
      throw requestError(503, "download_source_unavailable", "Chưa cấu hình nguồn tải trong Prowlarr/Radarr");
    }
    if (!downloadClients.some((client) => client.enable !== false)) {
      throw requestError(503, "download_client_unavailable", "Chưa có trình tải xuống đang hoạt động trong Radarr");
    }
  }

  async function startMovieSearch(movieId) {
    return arrJson({
      ...config.radarr,
      path: "/api/v3/command",
      method: "POST",
      body: { name: "MoviesSearch", movieIds: [Number(movieId)] },
      fetchImpl
    });
  }

  async function validateMovieRequest({ user, tmdbId }) {
    const dailyLimit = Number(db.getSetting("rate_limit_per_day") || 5);
    const usedToday = db.countRequestsSince({ userId: user.id, since: startOfTodayIso() });
    if (usedToday >= dailyLimit) throw requestError(429, "rate_limited", "Đã đạt giới hạn hôm nay");

    const existing = await findExistingMovie(tmdbId);
    if (existing?.hasFile || existing?.movieFile) throw requestError(409, "already_available", "Đã có trong thư viện");
    await ensureMovieDownloadReady();
    return existing;
  }

  async function upsertMovie({ existing, tmdbId, qualityProfileId }) {
    if (existing) {
      const updated = await arrJson({
        ...config.radarr,
        path: `/api/v3/movie/${existing.id}`,
        method: "PUT",
        body: { ...existing, monitored: true, qualityProfileId: Number(qualityProfileId || existing.qualityProfileId) },
        fetchImpl
      });
      return updated.id;
    }

    const movie = await discover.movie(tmdbId);
    const rootFolders = await arrJson({ ...config.radarr, path: "/api/v3/rootfolder", fetchImpl });
    const qualityProfiles = await listQualityProfiles("movie");
    const rootFolderPath = rootFolders[0]?.path || "/data/library/movies";
    const profileId = Number(qualityProfileId || qualityProfiles[0]?.id);
    const added = await arrJson({
      ...config.radarr,
      path: "/api/v3/movie",
      method: "POST",
      body: {
        title: movie.title,
        qualityProfileId: profileId,
        titleSlug: movie.title?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tmdb-${tmdbId}`,
        images: movie.images || [],
        tmdbId: movie.id,
        year: Number((movie.release_date || "").slice(0, 4)) || undefined,
        rootFolderPath,
        monitored: true,
        addOptions: { searchForMovie: false }
      },
      fetchImpl
    });
    return added.id;
  }

  async function pushMovieRelease({ arrId, tmdbId, release }) {
    const result = await arrJson({
      ...config.radarr,
      path: "/api/v3/release/push",
      method: "POST",
      body: {
        title: release.title,
        size: Number(release.sizeBytes || 0),
        indexer: release.source,
        magnetUrl: release.magnetUrl,
        infoHash: release.infoHash,
        seeders: release.seeders,
        leechers: release.leechers,
        protocol: "torrent",
        publishDate: release.publishDate || new Date().toISOString(),
        tmdbId: Number(tmdbId),
        movieId: Number(arrId)
      },
      fetchImpl
    });
    const rejection = rejectedReleaseDecision(result);
    if (rejection) throw requestError(409, "release_rejected", rejection);
    return result;
  }

  async function createMovieRequest({ user, tmdbId, qualityProfileId }) {
    const existing = await validateMovieRequest({ user, tmdbId });

    const requestId = `req_${crypto.randomUUID()}`;
    const log = db.createRequestLog({ id: requestId, userId: user.id, mediaType: "movie", tmdbId, status: "queued" });
    let arrId = existing?.id || null;
    try {
      arrId = await upsertMovie({ existing, tmdbId, qualityProfileId });

      db.updateRequestLog({ id: requestId, arrId, status: "queued" });
      const command = await startMovieSearch(arrId);
      db.updateRequestLog({ id: requestId, arrId, commandId: command?.id || null, status: "queued" });
      return { requestId: log.id, status: "queued", mediaId: `movie-${arrId}` };
    } catch (error) {
      db.updateRequestLog({ id: requestId, arrId, status: "failed" });
      throw error;
    }
  }

  async function createSelectedReleaseRequest({ user, tmdbId, qualityProfileId, release }) {
    if (!release?.magnetUrl || !release?.infoHash) {
      throw requestError(400, "invalid_release", "Nguồn tải không hợp lệ");
    }
    const existing = await validateMovieRequest({ user, tmdbId });
    const requestId = `req_${crypto.randomUUID()}`;
    const log = db.createRequestLog({ id: requestId, userId: user.id, mediaType: "movie", tmdbId, status: "queued" });
    let arrId = existing?.id || null;
    try {
      arrId = await upsertMovie({ existing, tmdbId, qualityProfileId });
      db.updateRequestLog({ id: requestId, arrId, status: "queued" });
      await pushMovieRelease({ arrId, tmdbId, release });
      return { requestId: log.id, status: "queued", mediaId: `movie-${arrId}`, releaseTitle: release.title };
    } catch (error) {
      db.updateRequestLog({ id: requestId, arrId, status: "failed" });
      throw error;
    }
  }

  async function requestProgress(requestId) {
    const row = db.getRequestLog(requestId);
    if (!row) throw requestError(404, "not_found", "Request not found");
    if (!row.arr_id) return { status: row.status, progress: 0, eta: null };

    const movie = await arrJson({ ...config.radarr, path: `/api/v3/movie/${row.arr_id}`, fetchImpl });
    if (movie?.hasFile || movie?.movieFile) {
      db.updateRequestLog({ id: requestId, status: "available" });
      return { status: "available", progress: 100, eta: null };
    }

    const queue = await arrJson({
      ...config.radarr,
      path: "/api/v3/queue?page=1&pageSize=100&includeUnknownMovieItems=true",
      fetchImpl
    });
    const item = queueRecords(queue).find((entry) => Number(entry.movieId || entry.movie?.id) === Number(row.arr_id));
    if (item) {
      const error = queueError(item);
      const status = error ? "failed" : "downloading";
      db.updateRequestLog({ id: requestId, status });
      return {
        status,
        progress: queueProgress(item),
        eta: item.timeleft || item.estimatedCompletionTime || item.eta || null,
        ...(error ? { error } : {})
      };
    }

    if (row.command_id) {
      const command = await arrJson({ ...config.radarr, path: `/api/v3/command/${row.command_id}`, fetchImpl });
      if (["queued", "started"].includes(String(command?.state || "").toLowerCase())) {
        return { status: "queued", progress: 0, eta: null };
      }
      if (String(command?.state || "").toLowerCase() === "completed") {
        const failed = String(command?.result || "").toLowerCase() === "failed";
        const status = failed ? "failed" : "not_found";
        db.updateRequestLog({ id: requestId, status });
        return {
          status,
          progress: 0,
          eta: null,
          error: failed ? command?.message || "Radarr không thể tìm nguồn tải" : "Không tìm thấy nguồn phù hợp"
        };
      }
    }

    const lastUpdatedAt = Date.parse(row.updated_at || row.created_at || "");
    if (!row.command_id && Number.isFinite(lastUpdatedAt) && now() - lastUpdatedAt >= UNTRACKED_REQUEST_GRACE_MS) {
      const status = row.status === "failed" ? "failed" : "not_found";
      db.updateRequestLog({ id: requestId, status });
      return {
        status,
        progress: 0,
        eta: null,
        error: status === "failed" ? "Radarr không thể nhận nguồn tải" : "Radarr không tạo tác vụ tải cho nguồn đã chọn"
      };
    }

    return { status: row.status, progress: row.status === "available" ? 100 : 0, eta: null };
  }

  return {
    listQualityProfiles,
    async createRequest({ user, tmdbId, type = "movie", qualityProfileId }) {
      if (type !== "movie") throw requestError(400, "unsupported_type", "Block 03 currently supports movie requests first");
      return createMovieRequest({ user, tmdbId, qualityProfileId });
    },
    async createReleaseRequest({ user, tmdbId, type = "movie", qualityProfileId, release }) {
      if (type !== "movie") throw requestError(400, "unsupported_type", "Block 05 currently supports movie requests first");
      return createSelectedReleaseRequest({ user, tmdbId, qualityProfileId, release });
    },
    progress: requestProgress
  };
}
