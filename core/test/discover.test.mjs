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
