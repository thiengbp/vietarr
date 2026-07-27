import test from "node:test";
import assert from "node:assert/strict";
import { createDiscoverService, normalizeSearchQuery } from "../src/discover.mjs";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("release-style separators are normalized before searching TMDB", async () => {
  assert.equal(normalizeSearchQuery("  The.Eternal__Fragrance  "), "The Eternal Fragrance");
  const requestedQueries = [];
  const discover = createDiscoverService({
    config: { tmdbApiKey: "test-key" },
    fetchImpl: async (input) => {
      const url = new URL(input);
      requestedQueries.push(url.searchParams.get("query"));
      if (url.pathname.endsWith("/search/movie")) return json({ page: 1, total_pages: 1, results: [] });
      return json({ page: 1, total_pages: 1, results: [{ id: 251600, name: "Thiên Hương", first_air_date: "2026-01-01" }] });
    }
  });

  const result = await discover.search({ q: "The.Eternal__Fragrance" });

  assert.deepEqual(requestedQueries, ["The Eternal Fragrance", "The Eternal Fragrance"]);
  assert.equal(result.results[0].title, "Thiên Hương");
  assert.equal(result.results[0].type, "series");
});

test("home feeds map to honest TMDB endpoints", async () => {
  const requests = [];
  const discover = createDiscoverService({
    config: { tmdbApiKey: "test-key" },
    fetchImpl: async (input) => {
      const url = new URL(input);
      requests.push({ path: url.pathname, params: Object.fromEntries(url.searchParams) });
      return json({ page: 1, total_pages: 2, results: [{ id: 12, title: "A Film", release_date: "2026-07-28" }] });
    }
  });

  const today = await discover.homeFeed({ feed: "today" });
  const week = await discover.homeFeed({ feed: "week", page: 2 });
  const popular = await discover.homeFeed({ feed: "popular" });
  const genre = await discover.homeFeed({ feed: "genre", genreId: 878 });

  assert.deepEqual(requests.map((entry) => entry.path), [
    "/3/trending/movie/day",
    "/3/trending/movie/week",
    "/3/movie/popular",
    "/3/discover/movie"
  ]);
  assert.equal(requests[3].params.with_genres, "878");
  assert.equal(requests[3].params.sort_by, "popularity.desc");
  assert.equal(today.feed, "today");
  assert.equal(week.page, 1);
  assert.equal(popular.results[0].title, "A Film");
  assert.equal(genre.totalPages, 2);
});

test("home feed validates feed and genre", async () => {
  const discover = createDiscoverService({
    config: { tmdbApiKey: "test-key" },
    fetchImpl: async () => json({ results: [] })
  });

  await assert.rejects(
    () => discover.homeFeed({ feed: "unknown" }),
    (error) => error.status === 400 && error.code === "invalid_home_feed"
  );
  await assert.rejects(
    () => discover.homeFeed({ feed: "genre" }),
    (error) => error.status === 400 && error.code === "invalid_genre"
  );
});

test("home genres return cleaned id and name pairs", async () => {
  const discover = createDiscoverService({
    config: { tmdbApiKey: "test-key" },
    fetchImpl: async (input) => {
      assert.equal(new URL(input).pathname, "/3/genre/movie/list");
      return json({ genres: [{ id: 28, name: "Hành động" }, { id: null, name: "Bỏ qua" }] });
    }
  });

  assert.deepEqual(await discover.genres(), { results: [{ id: 28, name: "Hành động" }] });
});
