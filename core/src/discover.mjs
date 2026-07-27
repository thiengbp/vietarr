const TMDB_BASE = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const BACKDROP_BASE = "https://image.tmdb.org/t/p/w780";
const HOME_FEEDS = new Set(["today", "week", "popular", "genre"]);

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

export function normalizeSearchQuery(query) {
  return String(query || "")
    .replace(/[._]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
      const query = normalizeSearchQuery(q);
      if (!query) return { page: 1, totalPages: 1, results: [] };
      const [movies, series] = await Promise.all([
        fetchTmdb({ config, path: "/search/movie", params: { query, page, include_adult: "false" }, fetchImpl }),
        fetchTmdb({ config, path: "/search/tv", params: { query, page, include_adult: "false" }, fetchImpl })
      ]);
      return {
        page: movies.page || series.page || page,
        totalPages: Math.max(movies.total_pages || 1, series.total_pages || 1),
        results: [
          ...(movies.results || []).map((item) => mapItem(item, "movie")),
          ...(series.results || []).map((item) => mapItem(item, "series"))
        ]
      };
    },
    async homeFeed({ feed = "today", page = 1, genreId } = {}) {
      if (!HOME_FEEDS.has(feed)) {
        const error = new Error("feed must be today, week, popular, or genre");
        error.status = 400;
        error.code = "invalid_home_feed";
        throw error;
      }

      let path = `/trending/movie/${feed === "today" ? "day" : "week"}`;
      const params = { page };
      if (feed === "popular") path = "/movie/popular";
      if (feed === "genre") {
        const parsedGenreId = Number(genreId);
        if (!Number.isInteger(parsedGenreId) || parsedGenreId < 1) {
          const error = new Error("genreId must be a positive integer when feed=genre");
          error.status = 400;
          error.code = "invalid_genre";
          throw error;
        }
        path = "/discover/movie";
        params.with_genres = parsedGenreId;
        params.sort_by = "popularity.desc";
        params.include_adult = "false";
      }

      const data = await fetchTmdb({ config, path, params, fetchImpl });
      return {
        feed,
        page: data.page || page,
        totalPages: data.total_pages || 1,
        results: (data.results || []).map((item) => mapItem(item, "movie"))
      };
    },
    async genres() {
      const data = await fetchTmdb({ config, path: "/genre/movie/list", fetchImpl });
      return {
        results: (data.genres || [])
          .filter((genre) => Number.isInteger(genre.id) && genre.name)
          .map((genre) => ({ id: genre.id, name: genre.name }))
      };
    },
    async movie(tmdbId, { language = "vi-VN" } = {}) {
      return fetchTmdb({ config, path: `/movie/${encodeURIComponent(tmdbId)}`, params: { language }, fetchImpl });
    },
    async series(tmdbId, { language = "vi-VN" } = {}) {
      return fetchTmdb({ config, path: `/tv/${encodeURIComponent(tmdbId)}`, params: { language }, fetchImpl });
    }
  };
}
