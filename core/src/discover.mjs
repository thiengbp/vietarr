const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";

function tmdbError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function mapItem(item, type = "movie") {
  const title = item.title || item.name || item.original_title || item.original_name || "Không rõ tên";
  const date = item.release_date || item.first_air_date || "";
  return {
    tmdbId: item.id,
    type,
    title,
    year: date ? Number(date.slice(0, 4)) : null,
    overview: item.overview || "",
    posterUrl: item.poster_path ? `${IMAGE_BASE}${item.poster_path}` : null,
    backdropUrl: item.backdrop_path ? `${BACKDROP_BASE}${item.backdrop_path}` : null,
    status: "missing"
  };
}

async function fetchTmdb({ config, path, params = {}, fetchImpl = fetch }) {
  if (!config.tmdbApiKey) throw tmdbError(503, "TMDB API key is not configured");
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", config.tmdbApiKey);
  url.searchParams.set("language", "vi-VN");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  }
  const res = await fetchImpl(url);
  if (!res.ok) throw tmdbError(502, `TMDB unavailable: ${res.status}`);
  return res.json();
}

export function createDiscoverService({ config, fetchImpl = fetch }) {
  return {
    async trending({ page = 1 } = {}) {
      const data = await fetchTmdb({ config, path: "/trending/movie/week", params: { page }, fetchImpl });
      return {
        page: data.page || page,
        totalPages: data.total_pages || 1,
        results: (data.results || []).map((item) => mapItem(item, "movie"))
      };
    },
    async search({ q, page = 1 } = {}) {
      if (!q) return { page: 1, totalPages: 1, results: [] };
      const data = await fetchTmdb({ config, path: "/search/movie", params: { query: q, page, include_adult: "false" }, fetchImpl });
      return {
        page: data.page || page,
        totalPages: data.total_pages || 1,
        results: (data.results || []).map((item) => mapItem(item, "movie"))
      };
    },
    async movie(tmdbId) {
      return fetchTmdb({ config, path: `/movie/${encodeURIComponent(tmdbId)}`, fetchImpl });
    }
  };
}
