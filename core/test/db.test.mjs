import test from "node:test";
import assert from "node:assert/strict";
import { createAppDb } from "../src/db.mjs";

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
