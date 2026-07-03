const CACHE_TTL_MS = 60_000;

export class UpstreamError extends Error {
  constructor(upstream, cause) {
    super(`${upstream} upstream unavailable`);
    this.name = "UpstreamError";
    this.upstream = upstream;
    this.cause = cause;
  }
}

async function fetchJson(url, apiKey) {
  const headers = apiKey ? { "X-Api-Key": apiKey } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function createArrClient({ cache, config }) {
  async function cachedJson({ key, upstream, url, apiKey, allowStale = true }) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL_MS) {
      return { data: cached.value, stale: false };
    }
    try {
      const data = await fetchJson(url, apiKey);
      cache.set(key, data);
      return { data, stale: false };
    } catch (error) {
      if (allowStale && cached) return { data: cached.value, stale: true, warning: `${upstream} down, using cache` };
      throw new UpstreamError(upstream, error);
    }
  }

  return {
    async health() {
      const checks = await Promise.allSettled([
        fetch(`${config.radarr.baseUrl}/ping`),
        fetch(`${config.sonarr.baseUrl}/ping`),
        fetch(`${config.bazarr.baseUrl}`),
        fetch(`${config.qbit.baseUrl}`)
      ]);
      const [radarr, sonarr, bazarr, qbit] = checks.map((item) => item.status === "fulfilled" && item.value.ok ? "up" : "down");
      return { status: [radarr, sonarr, bazarr, qbit].every((v) => v === "up") ? "ok" : "degraded", radarr, sonarr, bazarr, qbit };
    },
    movies() {
      const url = `${config.radarr.baseUrl}/api/v3/movie?includeMovieFile=true`;
      return cachedJson({ key: "radarr:movies", upstream: "radarr", url, apiKey: config.radarr.apiKey });
    },
    movie(id) {
      const arrId = String(id).replace(/^movie-/, "");
      const url = `${config.radarr.baseUrl}/api/v3/movie/${encodeURIComponent(arrId)}?includeMovieFile=true`;
      return cachedJson({ key: `radarr:movie:${arrId}`, upstream: "radarr", url, apiKey: config.radarr.apiKey });
    },
    series() {
      const url = `${config.sonarr.baseUrl}/api/v3/series`;
      return cachedJson({ key: "sonarr:series", upstream: "sonarr", url, apiKey: config.sonarr.apiKey });
    }
  };
}
