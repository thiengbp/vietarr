import crypto from "node:crypto";

function releaseError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function normalizeInfoHash(value) {
  const hash = String(value || "").trim();
  if (/^[a-f0-9]{40}$/i.test(hash) || /^[a-f0-9]{64}$/i.test(hash) || /^[a-z2-7]{32}$/i.test(hash)) {
    return hash.toLowerCase();
  }
  return "";
}

function releaseId(indexerId, guid) {
  return crypto.createHash("sha256").update(`${indexerId || 0}\0${guid || ""}`).digest("base64url");
}

function qualityFromTitle(title) {
  const value = String(title || "");
  if (/\b(2160p|4k|uhd)\b/i.test(value)) return "2160p";
  if (/\b1080[pi]\b/i.test(value)) return "1080p";
  if (/\b720[pi]\b/i.test(value)) return "720p";
  if (/\b480[pi]\b/i.test(value)) return "480p";
  return "Không rõ";
}

function cleanNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function titleTokens(value) {
  const stopWords = new Set(["a", "an", "and", "of", "the", "to"]);
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopWords.has(token));
}

function matchesMedia(title, media) {
  const candidateTokens = new Set(titleTokens(title));
  const expectedTokenSets = [...new Set((media.searchTitles || [media.original_title, media.original_name, media.title, media.name]).filter(Boolean))]
    .map(titleTokens)
    .filter((tokens) => tokens.length > 0);
  if (expectedTokenSets.length > 0 && !expectedTokenSets.some((tokens) => tokens.every((token) => candidateTokens.has(token)))) return false;

  const expectedYear = String(media.release_date || media.first_air_date || "").slice(0, 4);
  const candidateYears = String(title || "").match(/\b(?:19|20)\d{2}\b/g) || [];
  return !expectedYear || candidateYears.length === 0 || candidateYears.includes(expectedYear);
}

function magnetUrl({ infoHash, title, sizeBytes }) {
  const params = [`xt=urn:btih:${encodeURIComponent(infoHash)}`];
  if (title) params.push(`dn=${encodeURIComponent(title)}`);
  if (Number.isFinite(sizeBytes) && sizeBytes > 0) params.push(`xl=${sizeBytes}`);
  return `magnet:?${params.join("&")}`;
}

function mapRelease(row) {
  const infoHash = normalizeInfoHash(row.infoHash || row.guid);
  if (!infoHash || String(row.protocol || "torrent").toLowerCase() !== "torrent") return null;
  const sizeBytes = cleanNumber(row.size);
  const title = String(row.title || "Không rõ release");
  return {
    id: releaseId(row.indexerId, row.guid),
    title,
    source: String(row.indexer || "Prowlarr"),
    quality: qualityFromTitle(title),
    sizeBytes,
    seeders: cleanNumber(row.seeders),
    leechers: cleanNumber(row.leechers),
    publishDate: row.publishDate || null,
    infoHash,
    magnetUrl: magnetUrl({ infoHash, title, sizeBytes })
  };
}

async function searchProwlarr({ config, query, type = "movie", fetchImpl }) {
  if (!config.prowlarr?.baseUrl || !config.prowlarr?.apiKey) {
    throw releaseError(503, "download_source_unavailable", "Chưa cấu hình Prowlarr cho VietArr Core");
  }
  const url = new URL(`${config.prowlarr.baseUrl.replace(/\/$/, "")}/api/v1/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("type", type === "series" ? "tvsearch" : "movie");
  url.searchParams.append("categories", type === "series" ? "5000" : "2000");
  url.searchParams.set("limit", "50");
  let response;
  try {
    response = await fetchImpl(url, {
      headers: { "X-Api-Key": config.prowlarr.apiKey },
      signal: AbortSignal.timeout(35_000)
    });
  } catch (_error) {
    throw releaseError(502, "upstream_unavailable", "Không thể kết nối Prowlarr");
  }
  if (!response.ok) {
    throw releaseError(502, "upstream_unavailable", `Prowlarr search failed: ${response.status}`);
  }
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

export function createReleaseService({ config, discover, fetchImpl = fetch }) {
  async function searchMediaReleases({ tmdbId, type = "movie" }) {
    const id = Number(tmdbId);
    if (!Number.isInteger(id) || id <= 0) {
      throw releaseError(400, "invalid_tmdb_id", "tmdbId không hợp lệ");
    }
    if (!["movie", "series"].includes(type)) {
      throw releaseError(400, "unsupported_type", "Loại nội dung chưa được hỗ trợ");
    }

    const isSeries = type === "series";
    const lookup = isSeries ? discover.series : discover.movie;
    if (typeof lookup !== "function") {
      throw releaseError(400, "unsupported_type", "Loại nội dung chưa được hỗ trợ");
    }
    const media = await lookup(id);
    let englishMedia = null;
    try {
      englishMedia = await lookup(id, { language: "en-US" });
    } catch (_error) {
      // The localized title is still sufficient when the optional English lookup fails.
    }
    const queries = [...new Set([
      media.original_title,
      media.original_name,
      media.title,
      media.name,
      englishMedia?.title,
      englishMedia?.name
    ].map((value) => String(value || "").trim()).filter(Boolean))];
    const mediaWithAliases = { ...media, searchTitles: queries };
    let results = [];
    for (const query of queries) {
      const rows = await searchProwlarr({ config, query, type, fetchImpl });
      results = rows
        .filter((row) => matchesMedia(row.title, mediaWithAliases))
        .map(mapRelease)
        .filter(Boolean);
      if (results.length > 0) break;
    }

    results = results
      .sort((left, right) => (right.seeders ?? -1) - (left.seeders ?? -1) || (right.publishDate || "").localeCompare(left.publishDate || ""))
      .slice(0, 50);

    return { source: "Prowlarr", results };
  }

  async function searchMovieReleases({ tmdbId }) {
    return searchMediaReleases({ tmdbId, type: "movie" });
  }

  async function findMovieRelease({ tmdbId, id }) {
    const result = await searchMovieReleases({ tmdbId });
    const release = result.results.find((item) => item.id === id);
    if (!release) {
      throw releaseError(409, "release_stale", "Nguồn tải đã thay đổi, vui lòng tìm lại");
    }
    return release;
  }

  return { searchMediaReleases, searchMovieReleases, findMovieRelease };
}
