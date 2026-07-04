import crypto from "node:crypto";

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

export function createRequestService({ db, config, discover, fetchImpl = fetch }) {
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

  async function createMovieRequest({ user, tmdbId, qualityProfileId }) {
    const dailyLimit = Number(db.getSetting("rate_limit_per_day") || 5);
    const usedToday = db.countRequestsSince({ userId: user.id, since: startOfTodayIso() });
    if (usedToday >= dailyLimit) throw requestError(429, "rate_limited", "Đã đạt giới hạn hôm nay");

    const existing = await findExistingMovie(tmdbId);
    if (existing?.hasFile || existing?.movieFile) throw requestError(409, "already_available", "Đã có trong thư viện");

    const requestId = `req_${crypto.randomUUID()}`;
    const log = db.createRequestLog({ id: requestId, userId: user.id, mediaType: "movie", tmdbId, status: "queued" });
    if (existing) {
      const updated = await arrJson({
        ...config.radarr,
        path: `/api/v3/movie/${existing.id}`,
        method: "PUT",
        body: { ...existing, monitored: false, qualityProfileId: Number(qualityProfileId || existing.qualityProfileId) },
        fetchImpl
      });
      db.updateRequestLog({ id: requestId, arrId: updated.id, status: "queued" });
      return { requestId, status: "queued", mediaId: `movie-${updated.id}` };
    }

    const movie = await discover.movie(tmdbId);
    const rootFolders = await arrJson({ ...config.radarr, path: "/api/v3/rootfolder", fetchImpl });
    const qualityProfiles = await listQualityProfiles("movie");
    const rootFolderPath = rootFolders[0]?.path || "/data/media/movies";
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
        monitored: false,
        addOptions: { searchForMovie: false }
      },
      fetchImpl
    });
    db.updateRequestLog({ id: requestId, arrId: added.id, status: "queued" });
    return { requestId: log.id, status: "queued", mediaId: `movie-${added.id}` };
  }

  return {
    listQualityProfiles,
    async createRequest({ user, tmdbId, type = "movie", qualityProfileId }) {
      if (type !== "movie") throw requestError(400, "unsupported_type", "Block 03 currently supports movie requests first");
      return createMovieRequest({ user, tmdbId, qualityProfileId });
    },
    progress(requestId) {
      const row = db.getRequestLog(requestId);
      if (!row) throw requestError(404, "not_found", "Request not found");
      return { status: row.status, progress: row.status === "available" ? 100 : 0, eta: null };
    }
  };
}
