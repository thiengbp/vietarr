import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, normalize } from "node:path";

const CONTENT_TYPES = {
  ".mp4": "video/mp4",
  ".m4v": "video/x-m4v",
  ".mkv": "video/x-matroska",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".ts": "video/mp2t"
};

export function contentTypeForPath(path) {
  return CONTENT_TYPES[extname(path || "").toLowerCase()] || "application/octet-stream";
}

export function imageUrl(images = [], preferred = ["poster", "cover", "fanart", "banner"]) {
  for (const coverType of preferred) {
    const found = images.find((image) => image.coverType === coverType && (image.remoteUrl || image.url));
    if (found) return found.remoteUrl || found.url;
  }
  return null;
}

export function qualityName(file) {
  return file?.quality?.quality?.name || file?.quality?.quality?.resolution?.toString() || null;
}

export function statusFromMovie(movie) {
  if (movie.movieFile || movie.hasFile) return "available";
  if (movie.monitored === false) return "unknown";
  return "missing";
}

export function toSmbPath(path, config) {
  if (!path) return null;
  const dataRelative = path.startsWith("/data/") ? path.slice("/data/".length) : path.replace(config.mediaRoot, "").replace(/^\/+/, "");
  return `${config.smbBaseUrl.replace(/\/$/, "")}/${dataRelative.split("/").map(encodeURIComponent).join("/")}`;
}

export function toHostPath(path, config) {
  if (!path) return null;
  if (path.startsWith(config.mediaRoot)) return normalize(path);
  if (path.startsWith("/data/")) return normalize(`${config.mediaRoot}/${path.slice("/data/".length)}`);
  return normalize(path);
}

export function isBrowserPlayable(file) {
  const path = file?.path || "";
  const mediaInfo = file?.mediaInfo || {};
  const ext = extname(path).toLowerCase();
  const videoCodec = String(mediaInfo.videoCodec || "").toLowerCase();
  const audioCodec = String(mediaInfo.audioCodec || "").toLowerCase();
  const videoOk = videoCodec.includes("h264") || videoCodec.includes("x264") || videoCodec.includes("avc");
  const audioOk = audioCodec.includes("aac");
  return [".mp4", ".m4v"].includes(ext) && videoOk && audioOk;
}

export function mapMovie(movie, config) {
  const file = movie.movieFile || null;
  const filePath = file?.path || movie.path || null;
  return {
    id: `movie-${movie.id}`,
    source: "radarr",
    tmdbId: movie.tmdbId || null,
    title: movie.title,
    year: movie.year || null,
    posterUrl: imageUrl(movie.images, ["poster", "cover"]),
    backdropUrl: imageUrl(movie.images, ["fanart", "background", "banner"]),
    quality: qualityName(file),
    status: statusFromMovie(movie),
    sizeBytes: file?.size || 0,
    path: filePath,
    smbPath: toSmbPath(filePath, config),
    hasVietnameseSubtitle: subtitleStatus(movie).vietnamese === "available",
    warning: null
  };
}

export function mapSeries(series, config) {
  const seasons = (series.seasons || []).map((season) => ({
    seasonNumber: season.seasonNumber,
    episodeCount: season.statistics?.episodeCount || 0,
    availableCount: season.statistics?.episodeFileCount || 0
  }));
  return {
    id: `series-${series.id}`,
    source: "sonarr",
    tvdbId: series.tvdbId || null,
    title: series.title,
    year: series.year || null,
    posterUrl: imageUrl(series.images, ["poster", "cover"]),
    backdropUrl: imageUrl(series.images, ["fanart", "background", "banner"]),
    quality: series.qualityProfileId ? `Profile ${series.qualityProfileId}` : null,
    status: seasons.some((season) => season.availableCount > 0) ? "available" : "missing",
    sizeBytes: series.statistics?.sizeOnDisk || 0,
    path: series.path || null,
    smbPath: toSmbPath(series.path, config),
    hasVietnameseSubtitle: null,
    seasons,
    warning: null
  };
}

export function movieDetail(movie, config) {
  const summary = mapMovie(movie, config);
  return {
    ...summary,
    overview: movie.overview || "",
    runtimeMinutes: movie.runtime || null,
    files: movie.movieFile ? [movie.movieFile].map((file) => ({
      id: summary.id,
      path: file.path,
      sizeBytes: file.size || 0,
      quality: qualityName(file),
      browserPlayable: isBrowserPlayable(file)
    })) : [],
    subtitleStatus: subtitleStatus(movie)
  };
}

export function mergeMovieSubtitles(movies, bazarrPayload) {
  const rows = Array.isArray(bazarrPayload) ? bazarrPayload : bazarrPayload?.data || bazarrPayload?.movies || [];
  if (!Array.isArray(rows) || rows.length === 0) return movies;
  const byRadarrId = new Map();
  const byTitle = new Map();
  for (const row of rows) {
    const radarrId = row.radarrId || row.radarr_id || row.movieId || row.movie_id;
    if (radarrId) byRadarrId.set(Number(radarrId), row);
    if (row.title) byTitle.set(String(row.title).toLowerCase(), row);
  }
  return movies.map((movie) => {
    const bazarr = byRadarrId.get(Number(movie.id)) || byTitle.get(String(movie.title || "").toLowerCase());
    if (!bazarr) return movie;
    return { ...movie, bazarrSubtitleStatus: bazarr };
  });
}

export function subtitleStatus(movie) {
  const bazarr = movie.bazarrSubtitleStatus;
  if (!bazarr) return { vietnamese: "unknown" };
  const hasVi = (value) => {
    const text = JSON.stringify(value || "").toLowerCase();
    return text.includes('"vi"') || text.includes("vietnamese") || text.includes("tiếng việt") || text.includes("vie");
  };
  if (hasVi(bazarr.missing_subtitles) || hasVi(bazarr.missingSubtitles)) return { vietnamese: "missing" };
  if (hasVi(bazarr.subtitles) || hasVi(bazarr.languages) || hasVi(bazarr.subtitlesPath)) {
    return { vietnamese: "available" };
  }
  return { vietnamese: "unknown" };
}

export function playOptions(media, config) {
  const file = media.movieFile || null;
  const filePath = file?.path || media.path || null;
  const smbPath = toSmbPath(filePath, config);
  const streamUrl = `${config.publicBaseUrl.replace(/\/$/, "")}/api/v1/stream/movie-${media.id}`;
  const browserPlayable = isBrowserPlayable(file);
  const encodedStream = encodeURIComponent(streamUrl);
  return {
    infuseUrl: `infuse://x-callback-url/play?url=${encodedStream}`,
    vlcUrl: `vlc-x-callback://x-callback-url/stream?url=${encodedStream}`,
    smbPath,
    httpStreamUrl: browserPlayable ? streamUrl : null,
    browserPlayable
  };
}

export function streamMovieFile(movie, config, rangeHeader) {
  const filePath = toHostPath(movie.movieFile?.path, config);
  if (!filePath || !existsSync(filePath)) {
    const err = new Error("File not found");
    err.status = 404;
    throw err;
  }
  const stat = statSync(filePath);
  const total = stat.size;
  const contentType = contentTypeForPath(filePath);
  if (!rangeHeader) {
    return {
      status: 200,
      headers: { "Accept-Ranges": "bytes", "Content-Length": total, "Content-Type": contentType },
      stream: createReadStream(filePath)
    };
  }
  const match = rangeHeader.match(/bytes=(\d*)-(\d*)/);
  if (!match) {
    const err = new Error("Invalid Range");
    err.status = 416;
    throw err;
  }
  let start;
  let end;
  if (!match[1] && match[2]) {
    const suffixLength = Number(match[2]);
    start = Math.max(total - suffixLength, 0);
    end = total - 1;
  } else {
    start = match[1] ? Number(match[1]) : 0;
    end = match[2] ? Number(match[2]) : total - 1;
  }
  if (start >= total || end >= total || start > end) {
    const err = new Error("Range Not Satisfiable");
    err.status = 416;
    err.headers = { "Content-Range": `bytes */${total}` };
    throw err;
  }
  return {
    status: 206,
    headers: {
      "Accept-Ranges": "bytes",
      "Content-Range": `bytes ${start}-${end}/${total}`,
      "Content-Length": end - start + 1,
      "Content-Type": contentType
    },
    stream: createReadStream(filePath, { start, end })
  };
}
