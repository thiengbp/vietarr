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
  let requestedQuery;
  const discover = createDiscoverService({
    config: { tmdbApiKey: "test-key" },
    fetchImpl: async (input) => {
      const url = new URL(input);
      requestedQuery = url.searchParams.get("query");
      return json({ page: 1, total_pages: 1, results: [{ id: 10, title: "The Eternal Fragrance", release_date: "2026-01-01" }] });
    }
  });

  const result = await discover.search({ q: "The.Eternal__Fragrance" });

  assert.equal(requestedQuery, "The Eternal Fragrance");
  assert.equal(result.results[0].title, "The Eternal Fragrance");
});
