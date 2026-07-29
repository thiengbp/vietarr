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

function releaseId(infoHash) {
  return crypto.createHash("sha256").update(`release\0${infoHash}`).digest("base64url");
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

function hasMeasuredSwarmCounts(source) {
  // BTDig does not expose live seed/leech counts. Its Cardigann definition
  // uses a numeric sentinel only because the indexer contract requires one.
  return String(source || "").trim().toLowerCase() !== "btdig";
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

function normalizeRelease(row, fallbackSource = "Prowlarr") {
  const infoHash = normalizeInfoHash(row.infoHash || row.guid);
  if (!infoHash || String(row.protocol || "torrent").toLowerCase() !== "torrent") return null;
  const sizeBytes = cleanNumber(row.sizeBytes ?? row.size);
  const title = String(row.title || "Không rõ release");
  const source = String(row.source || row.indexer || fallbackSource);
  const measuredSwarmCounts = hasMeasuredSwarmCounts(source);
  const sources = [...new Set([
    ...(Array.isArray(row.sources) ? row.sources : []),
    source
  ].map((value) => String(value || "").trim()).filter(Boolean))];
  return {
    id: releaseId(infoHash),
    title,
    source,
    sources,
    quality: row.quality || qualityFromTitle(title),
    sizeBytes,
    seeders: measuredSwarmCounts ? cleanNumber(row.seeders) : null,
    leechers: measuredSwarmCounts ? cleanNumber(row.leechers) : null,
    publishDate: row.publishDate || null,
    infoHash,
    magnetUrl: magnetUrl({ infoHash, title, sizeBytes })
  };
}

function mergeNumber(left, right) {
  if (left == null) return right;
  if (right == null) return left;
  return Math.max(left, right);
}

function dedupeReleases(releases) {
  const byHash = new Map();
  for (const release of releases) {
    const existing = byHash.get(release.infoHash);
    if (!existing) {
      byHash.set(release.infoHash, release);
      continue;
    }
    const sources = [...new Set([...existing.sources, ...release.sources])];
    byHash.set(release.infoHash, {
      ...existing,
      sources,
      seeders: mergeNumber(existing.seeders, release.seeders),
      leechers: mergeNumber(existing.leechers, release.leechers),
      sizeBytes: mergeNumber(existing.sizeBytes, release.sizeBytes),
      publishDate: [existing.publishDate, release.publishDate].filter(Boolean).sort().at(-1) || null
    });
  }
  return [...byHash.values()];
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

export function createProwlarrProvider({ config, fetchImpl = fetch }) {
  return {
    id: "prowlarr",
    label: "Prowlarr",
    timeoutMs: 35_000,
    configured: Boolean(config.prowlarr?.baseUrl && config.prowlarr?.apiKey),
    async search({ query, type }) {
      const rows = await searchProwlarr({ config, query, type, fetchImpl });
      return rows.map((row) => normalizeRelease(row, "Prowlarr")).filter(Boolean);
    }
  };
}

async function runProviderSearch(provider, task) {
  const timeoutMs = Number.isFinite(provider.timeoutMs) && provider.timeoutMs > 0 ? provider.timeoutMs : 12_000;
  let timeoutId;
  try {
    return await Promise.race([
      Promise.resolve().then(task),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("provider_timeout")), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function searchProvider({ provider, queries, type, media }) {
  const startedAt = Date.now();
  try {
    const releases = await runProviderSearch(provider, async () => {
      let matches = [];
      for (const query of queries) {
        const candidates = await provider.search({ query, type });
        matches = (Array.isArray(candidates) ? candidates : [])
          .map((row) => normalizeRelease(row, provider.label))
          .filter(Boolean)
          .filter((release) => matchesMedia(release.title, media));
        if (matches.length > 0) break;
      }
      return matches;
    });
    return {
      status: {
        id: provider.id,
        label: provider.label,
        status: "ok",
        count: releases.length,
        latencyMs: Date.now() - startedAt
      },
      releases
    };
  } catch (_error) {
    return {
      status: {
        id: provider.id,
        label: provider.label,
        status: "unavailable",
        count: 0,
        latencyMs: Date.now() - startedAt,
        message: `${provider.label} hiện không phản hồi`
      },
      releases: []
    };
  }
}

export function createReleaseService({ config, discover, fetchImpl = fetch, providers, logger = null }) {
  const releaseProviders = providers || [createProwlarrProvider({ config, fetchImpl })];

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
    const activeProviders = releaseProviders.filter((provider) => provider?.configured !== false && typeof provider?.search === "function");
    if (activeProviders.length === 0) {
      throw releaseError(503, "download_source_unavailable", "Chưa cấu hình nguồn tải cho VietArr Core");
    }

    const providerResults = await Promise.all(activeProviders.map((provider) => searchProvider({
      provider,
      queries,
      type,
      media: mediaWithAliases
    })));

    const results = dedupeReleases(providerResults.flatMap((result) => result.releases))
      .sort((left, right) => (right.seeders ?? -1) - (left.seeders ?? -1) || (right.publishDate || "").localeCompare(left.publishDate || ""))
      .slice(0, 50);
    const providerStatuses = providerResults.map((result) => result.status);
    for (const provider of providerStatuses) {
      if (provider.status === "ok") continue;
      logger?.warn?.(JSON.stringify({
        event: "release_provider_unavailable",
        providerId: provider.id,
        status: provider.status,
        latencyMs: provider.latencyMs
      }));
    }

    return {
      source: "Prowlarr",
      partial: providerStatuses.some((provider) => provider.status !== "ok"),
      providers: providerStatuses,
      results
    };
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
