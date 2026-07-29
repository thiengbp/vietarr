import test from "node:test";
import assert from "node:assert/strict";
import Database from "better-sqlite3";
import { createAppDb, migrateAppSchema } from "../src/db.mjs";

test("failed and not_found requests do not consume the daily limit", () => {
  const db = createAppDb(":memory:");
  const user = db.createUser({ username: "tester", passwordHash: "unused", role: "member" });
  const rows = [
    ["req_queued", "queued"],
    ["req_available", "available"],
    ["req_failed", "failed"],
    ["req_not_found", "not_found"]
  ];
  for (const [id, status] of rows) {
    db.createRequestLog({ id, userId: user.id, mediaType: "movie", tmdbId: 10, status });
  }

  assert.equal(db.countRequestsSince({ userId: user.id, since: "1970-01-01T00:00:00.000Z" }), 2);
  db.close();
});

test("request log migration preserves legacy rows and enables idempotent episode requests", () => {
  const legacy = new Database(":memory:");
  legacy.exec(`
    CREATE TABLE request_log (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'series')),
      tmdb_id INTEGER NOT NULL,
      arr_id INTEGER,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    INSERT INTO request_log (id, user_id, media_type, tmdb_id, arr_id, status, created_at, updated_at)
    VALUES ('legacy', 1, 'movie', 10, 2, 'available', '2026-07-29T00:00:00Z', '2026-07-29T00:00:00Z');
  `);

  migrateAppSchema(legacy);

  assert.equal(legacy.prepare("SELECT status FROM request_log WHERE id = 'legacy'").get().status, "available");
  assert.equal(legacy.prepare("PRAGMA table_info(request_log)").all().find((column) => column.name === "tmdb_id").notnull, 0);
  legacy.prepare(`
    INSERT INTO users (id, username, password_hash, role, created_at, updated_at)
    VALUES (1, 'legacy-user', 'unused', 'member', '2026-07-29T00:00:00Z', '2026-07-29T00:00:00Z')
  `).run();
  legacy.prepare(`
    INSERT INTO request_log (id, user_id, media_type, episode_id, status, created_at, updated_at)
    VALUES ('episode', 1, 'episode', 31, 'queued', '2026-07-29T00:00:00Z', '2026-07-29T00:00:00Z')
  `).run();
  legacy.close();

  const db = createAppDb(":memory:");
  const user = db.createUser({ username: "episode-user", passwordHash: "unused", role: "member" });
  const row = db.createRequestLog({ id: "epreq_1", userId: user.id, mediaType: "episode", episodeId: 31 });
  assert.equal(row.episode_id, 31);
  assert.equal(db.findActiveEpisodeRequest({ userId: user.id, episodeId: 31 }).id, "epreq_1");
  db.updateRequestLog({ id: "epreq_1", status: "not_found" });
  assert.equal(db.findActiveEpisodeRequest({ userId: user.id, episodeId: 31 }), null);
  db.close();
});
