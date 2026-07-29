import test from "node:test";
import assert from "node:assert/strict";
import { createReleaseService } from "../src/releases.mjs";

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}

const config = {
  prowlarr: { baseUrl: "http://prowlarr:9696", apiKey: "private-test-key" }
};
const discover = {
  movie: async () => ({ id: 10, title: "Hương Thơm Vĩnh Cửu", original_title: "The Eternal Fragrance" })
};

test("release search returns clean magnets without Prowlarr credentials", async () => {
  let requestedUrl;
  const fetchImpl = async (input, options) => {
    requestedUrl = new URL(input);
    assert.equal(options.headers["X-Api-Key"], "private-test-key");
    return json([
      {
        guid: "0123456789abcdef0123456789abcdef01234567",
        title: "The.Eternal.Fragrance.2026.2160p.WEB-DL",
        indexerId: 1,
        indexer: "Bitmagnet",
        protocol: "torrent",
        size: 1234,
        seeders: 8,
        leechers: 2,
        publishDate: "2026-07-27T10:00:00Z",
        infoHash: "0123456789abcdef0123456789abcdef01234567",
        downloadUrl: "http://prowlarr:9696/1/download?apikey=private-test-key",
        magnetUrl: "http://prowlarr:9696/1/download?apikey=private-test-key"
      },
      {
        guid: "89abcdef0123456789abcdef0123456789abcdef",
        title: "Unrelated.Movie.2026.1080p.WEB-DL",
        indexerId: 1,
        indexer: "Bitmagnet",
        protocol: "torrent",
        size: 4321,
        seeders: 99,
        leechers: 1,
        infoHash: "89abcdef0123456789abcdef0123456789abcdef"
      }
    ]);
  };

  const service = createReleaseService({ config, discover, fetchImpl });
  const response = await service.searchMovieReleases({ tmdbId: 10 });
  assert.equal(requestedUrl.searchParams.get("query"), "The Eternal Fragrance");
  assert.equal(requestedUrl.searchParams.get("type"), "movie");
  assert.equal(response.results.length, 1);
  assert.equal(response.source, "Prowlarr");
  assert.equal(response.partial, false);
  assert.deepEqual(response.providers.map(({ id, status, count }) => ({ id, status, count })), [
    { id: "prowlarr", status: "ok", count: 1 }
  ]);
  assert.equal(response.results[0].quality, "2160p");
  assert.deepEqual(response.results[0].sources, ["Bitmagnet"]);
  assert.match(response.results[0].magnetUrl, /^magnet:\?xt=urn:btih:0123456789abcdef/);
  assert.equal(JSON.stringify(response).includes("private-test-key"), false);
  assert.equal(JSON.stringify(response).includes("downloadUrl"), false);
});

test("release selection rejects IDs that are no longer in search results", async () => {
  const service = createReleaseService({ config, discover, fetchImpl: async () => json([]) });
  await assert.rejects(
    service.findMovieRelease({ tmdbId: 10, id: "stale" }),
    (error) => error.status === 409 && error.code === "release_stale"
  );
});

test("release search falls back to the English TMDB title", async () => {
  const queries = [];
  const localizedDiscover = {
    movie: async (_id, options = {}) => options.language === "en-US"
      ? { id: 10, title: "The Eternal Fragrance", original_title: "千香", release_date: "2026-01-01" }
      : { id: 10, title: "Thiên Hương", original_title: "千香", release_date: "2026-01-01" }
  };
  const fetchImpl = async (input) => {
    const query = new URL(input).searchParams.get("query");
    queries.push(query);
    if (query !== "The Eternal Fragrance") return json([]);
    return json([{
      guid: "0123456789abcdef0123456789abcdef01234567",
      title: "The.Eternal.Fragrance.2026.1080p.WEB-DL",
      indexerId: 1,
      indexer: "Bitmagnet",
      protocol: "torrent",
      infoHash: "0123456789abcdef0123456789abcdef01234567",
      seeders: 2
    }]);
  };

  const service = createReleaseService({ config, discover: localizedDiscover, fetchImpl });
  const response = await service.searchMovieReleases({ tmdbId: 10 });
  assert.deepEqual(queries, ["千香", "Thiên Hương", "The Eternal Fragrance"]);
  assert.equal(response.results.length, 1);
});

test("series release search uses TMDB TV metadata and Prowlarr TV category", async () => {
  let requestedUrl;
  const seriesDiscover = {
    series: async (_id, options = {}) => options.language === "en-US"
      ? { id: 251600, name: "The Eternal Fragrance", original_name: "千香", first_air_date: "2026-01-01" }
      : { id: 251600, name: "Thiên Hương", original_name: "千香", first_air_date: "2026-01-01" }
  };
  const fetchImpl = async (input) => {
    requestedUrl = new URL(input);
    if (requestedUrl.searchParams.get("query") !== "The Eternal Fragrance") return json([]);
    return json([{
      guid: "0123456789abcdef0123456789abcdef01234567",
      title: "The.Eternal.Fragrance.2026.S01E01-E22.2160p.WEB-DL",
      indexerId: 1,
      indexer: "Bitmagnet",
      protocol: "torrent",
      infoHash: "0123456789abcdef0123456789abcdef01234567",
      seeders: 8
    }]);
  };

  const service = createReleaseService({ config, discover: seriesDiscover, fetchImpl });
  const response = await service.searchMediaReleases({ tmdbId: 251600, type: "series" });

  assert.equal(requestedUrl.searchParams.get("type"), "tvsearch");
  assert.deepEqual(requestedUrl.searchParams.getAll("categories"), ["5000"]);
  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].source, "Bitmagnet");
});

test("release search merges duplicate info hashes across providers", async () => {
  const hash = "0123456789abcdef0123456789abcdef01234567";
  const providers = [
    {
      id: "prowlarr",
      label: "Prowlarr",
      configured: true,
      search: async () => [{
        title: "The.Eternal.Fragrance.2026.2160p.WEB-DL",
        source: "Bitmagnet",
        infoHash: hash,
        sizeBytes: 1200,
        seeders: 8,
        leechers: 2
      }]
    },
    {
      id: "catalog-api",
      label: "Catalog API",
      configured: true,
      search: async () => [{
        title: "The Eternal Fragrance 2026 2160p WEB-DL",
        source: "Catalog API",
        infoHash: hash.toUpperCase(),
        sizeBytes: 1234,
        seeders: 12,
        leechers: 3
      }]
    }
  ];

  const service = createReleaseService({ config, discover, providers });
  const response = await service.searchMovieReleases({ tmdbId: 10 });

  assert.equal(response.partial, false);
  assert.equal(response.results.length, 1);
  assert.deepEqual(response.results[0].sources, ["Bitmagnet", "Catalog API"]);
  assert.equal(response.results[0].seeders, 12);
  assert.equal(response.results[0].leechers, 3);
  assert.equal(response.results[0].sizeBytes, 1234);
});

test("release search returns healthy provider results when another provider fails", async () => {
  const warnings = [];
  const providers = [
    {
      id: "prowlarr",
      label: "Prowlarr",
      configured: true,
      search: async () => [{
        title: "The Eternal Fragrance 2026 1080p WEB-DL",
        source: "Bitmagnet",
        infoHash: "0123456789abcdef0123456789abcdef01234567",
        seeders: 4
      }]
    },
    {
      id: "offline",
      label: "Nguồn dự phòng",
      configured: true,
      search: async () => {
        throw new Error("https://internal.invalid/?apikey=must-not-leak");
      }
    }
  ];

  const service = createReleaseService({
    config,
    discover,
    providers,
    logger: { warn: (message) => warnings.push(message) }
  });
  const response = await service.searchMovieReleases({ tmdbId: 10 });

  assert.equal(response.partial, true);
  assert.equal(response.results.length, 1);
  assert.deepEqual(response.providers.map(({ id, status }) => ({ id, status })), [
    { id: "prowlarr", status: "ok" },
    { id: "offline", status: "unavailable" }
  ]);
  assert.equal(JSON.stringify(response).includes("internal.invalid"), false);
  assert.equal(JSON.stringify(response).includes("must-not-leak"), false);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].includes("internal.invalid"), false);
  assert.equal(warnings[0].includes("must-not-leak"), false);
});

test("release search rejects requests when no provider is configured", async () => {
  const service = createReleaseService({
    config: { ...config, prowlarr: { baseUrl: "", apiKey: "" } },
    discover
  });

  await assert.rejects(
    service.searchMovieReleases({ tmdbId: 10 }),
    (error) => error.status === 503 && error.code === "download_source_unavailable"
  );
});

test("release search bounds a slow provider without blocking healthy results", async () => {
  const providers = [
    {
      id: "prowlarr",
      label: "Prowlarr",
      configured: true,
      search: async () => [{
        title: "The Eternal Fragrance 2026 1080p WEB-DL",
        source: "Bitmagnet",
        infoHash: "0123456789abcdef0123456789abcdef01234567",
        seeders: 4
      }]
    },
    {
      id: "slow",
      label: "Nguồn chậm",
      configured: true,
      timeoutMs: 5,
      search: async () => new Promise(() => {})
    }
  ];

  const service = createReleaseService({ config, discover, providers });
  const response = await service.searchMovieReleases({ tmdbId: 10 });

  assert.equal(response.partial, true);
  assert.equal(response.results.length, 1);
  assert.equal(response.providers.find((provider) => provider.id === "slow").status, "unavailable");
});

test("release search normalizes missing metadata and keeps deterministic ranking", async () => {
  const providers = [{
    id: "catalog",
    label: "Catalog",
    configured: true,
    search: async () => [
      {
        title: "The Eternal Fragrance 2026 1080p WEB-DL A",
        infoHash: "0123456789abcdef0123456789abcdef01234567",
        publishDate: "2026-07-28T10:00:00Z"
      },
      {
        title: "The Eternal Fragrance 2026 1080p WEB-DL B",
        infoHash: "89abcdef0123456789abcdef0123456789abcdef",
        publishDate: "2026-07-29T10:00:00Z"
      }
    ]
  }];

  const service = createReleaseService({ config, discover, providers });
  const first = await service.searchMovieReleases({ tmdbId: 10 });
  const second = await service.searchMovieReleases({ tmdbId: 10 });

  assert.deepEqual(first.results.map((release) => release.infoHash), second.results.map((release) => release.infoHash));
  assert.equal(first.results[0].title.endsWith("B"), true);
  assert.equal(first.results[0].sizeBytes, null);
  assert.equal(first.results[0].seeders, null);
  assert.equal(first.results[0].leechers, null);
});

test("release search does not present BTDig sentinel counts as measured swarm data", async () => {
  const providers = [{
    id: "prowlarr",
    label: "Prowlarr",
    configured: true,
    search: async () => [{
      title: "The Eternal Fragrance 2026 2160p WEB-DL",
      source: "BTDig",
      infoHash: "0123456789abcdef0123456789abcdef01234567",
      seeders: 1,
      leechers: 1
    }]
  }];

  const service = createReleaseService({ config, discover, providers });
  const response = await service.searchMovieReleases({ tmdbId: 10 });

  assert.equal(response.results.length, 1);
  assert.equal(response.results[0].source, "BTDig");
  assert.equal(response.results[0].seeders, null);
  assert.equal(response.results[0].leechers, null);
});
