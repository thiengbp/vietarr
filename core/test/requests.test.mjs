import test from "node:test";
import assert from "node:assert/strict";
import { createRequestService } from "../src/requests.mjs";

function json(value, status = 200) {
  return new Response(status === 204 ? null : JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" }
  });
}

function createDb() {
  const logs = new Map();
  return {
    logs,
    getSetting: () => "20",
    countRequestsSince: () => 0,
    createRequestLog(row) {
      const next = { ...row, arr_id: null, command_id: null };
      logs.set(row.id, next);
      return next;
    },
    updateRequestLog({ id, arrId = null, commandId = null, status }) {
      const current = logs.get(id);
      const next = {
        ...current,
        arr_id: arrId ?? current.arr_id,
        command_id: commandId ?? current.command_id,
        status
      };
      logs.set(id, next);
      return next;
    },
    getRequestLog: (id) => logs.get(id) || null
  };
}

const config = {
  radarr: { baseUrl: "http://radarr:7878", apiKey: "test-key" },
  sonarr: { baseUrl: "http://sonarr:8989", apiKey: "test-key" }
};
const user = { id: 1 };
const discover = { movie: async (id) => ({ id, title: "Test Movie", release_date: "2026-01-01" }) };

test("request is rejected before creating false progress when no indexer exists", async () => {
  const db = createDb();
  const fetchImpl = async (input) => {
    const url = new URL(input);
    if (url.pathname === "/api/v3/movie") return json([]);
    if (url.pathname === "/api/v3/indexer") return json([]);
    if (url.pathname === "/api/v3/downloadclient") return json([{ id: 1, enable: true }]);
    throw new Error(`Unexpected request ${url.pathname}`);
  };
  const service = createRequestService({ db, config, discover, fetchImpl });
  await assert.rejects(
    service.createRequest({ user, tmdbId: 10, qualityProfileId: 1 }),
    (error) => error.status === 503 && error.code === "download_source_unavailable"
  );
  assert.equal(db.logs.size, 0);
});

test("existing movie is monitored, searched and reports real queue progress", async () => {
  const db = createDb();
  let available = false;
  let updatedMovie;
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    if (url.pathname === "/api/v3/movie" && url.searchParams.has("tmdbId")) {
      return json([{ id: 2, tmdbId: 10, title: "Test Movie", monitored: false, hasFile: false, qualityProfileId: 1 }]);
    }
    if (url.pathname === "/api/v3/indexer") return json([{ id: 1, enableAutomaticSearch: true }]);
    if (url.pathname === "/api/v3/downloadclient") return json([{ id: 1, enable: true }]);
    if (url.pathname === "/api/v3/movie/2" && options.method === "PUT") {
      updatedMovie = JSON.parse(options.body);
      return json({ ...updatedMovie, id: 2 });
    }
    if (url.pathname === "/api/v3/command" && options.method === "POST") {
      assert.deepEqual(JSON.parse(options.body), { name: "MoviesSearch", movieIds: [2] });
      return json({ id: 77, state: "queued" }, 201);
    }
    if (url.pathname === "/api/v3/movie/2") {
      return json(available ? { id: 2, hasFile: true, movieFile: { path: "/data/movie.mkv" } } : { id: 2, hasFile: false });
    }
    if (url.pathname === "/api/v3/queue") {
      return json({ records: [{ movieId: 2, status: "downloading", size: 1000, sizeleft: 400, timeleft: "00:10:00" }] });
    }
    throw new Error(`Unexpected request ${options.method || "GET"} ${url.pathname}`);
  };

  const service = createRequestService({ db, config, discover, fetchImpl });
  const result = await service.createRequest({ user, tmdbId: 10, qualityProfileId: 1 });
  assert.equal(result.status, "queued");
  assert.equal(updatedMovie.monitored, true);
  assert.equal(db.getRequestLog(result.requestId).command_id, 77);

  assert.deepEqual(await service.progress(result.requestId), {
    status: "downloading",
    progress: 60,
    eta: "00:10:00"
  });

  available = true;
  assert.deepEqual(await service.progress(result.requestId), {
    status: "available",
    progress: 100,
    eta: null
  });
});
