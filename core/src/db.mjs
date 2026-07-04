import Database from "better-sqlite3";

const DEFAULT_RATE_LIMIT_PER_DAY = 5;

function nowIso() {
  return new Date().toISOString();
}

export function migrateAppSchema(db) {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_hash TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_by_user_id INTEGER,
      created_at TEXT NOT NULL,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS request_log (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      media_type TEXT NOT NULL CHECK (media_type IN ('movie', 'series')),
      tmdb_id INTEGER NOT NULL,
      arr_id INTEGER,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO NOTHING
  `).run("rate_limit_per_day", String(DEFAULT_RATE_LIMIT_PER_DAY), nowIso());
}

export function createAppDb(path) {
  const db = new Database(path);
  migrateAppSchema(db);

  const getUserByUsernameStmt = db.prepare("SELECT * FROM users WHERE username = ?");
  const getUserByIdStmt = db.prepare("SELECT * FROM users WHERE id = ?");
  const createUserStmt = db.prepare(`
    INSERT INTO users (username, password_hash, role, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const createInviteStmt = db.prepare(`
    INSERT INTO invites (token_hash, role, expires_at, created_by_user_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const getInviteStmt = db.prepare("SELECT * FROM invites WHERE token_hash = ?");
  const markInviteUsedStmt = db.prepare("UPDATE invites SET used_at = ? WHERE id = ? AND used_at IS NULL");
  const getSettingStmt = db.prepare("SELECT value FROM settings WHERE key = ?");
  const setSettingStmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const listUsersStmt = db.prepare("SELECT id, username, role, created_at FROM users ORDER BY id ASC");
  const countRequestsTodayStmt = db.prepare(`
    SELECT COUNT(*) AS count
    FROM request_log
    WHERE user_id = ? AND created_at >= ?
  `);
  const insertRequestStmt = db.prepare(`
    INSERT INTO request_log (id, user_id, media_type, tmdb_id, arr_id, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const getRequestStmt = db.prepare("SELECT * FROM request_log WHERE id = ?");
  const updateRequestStmt = db.prepare("UPDATE request_log SET arr_id = ?, status = ?, updated_at = ? WHERE id = ?");

  return {
    db,
    close() {
      db.close();
    },
    listTables() {
      return db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((row) => row.name);
    },
    createUser({ username, passwordHash, role = "member" }) {
      const ts = nowIso();
      const result = createUserStmt.run(username, passwordHash, role, ts, ts);
      return getUserByIdStmt.get(result.lastInsertRowid);
    },
    getUserByUsername(username) {
      return getUserByUsernameStmt.get(username) || null;
    },
    getUserById(id) {
      return getUserByIdStmt.get(id) || null;
    },
    listUsers() {
      return listUsersStmt.all().map((user) => ({
        id: user.id,
        username: user.username,
        role: user.role,
        createdAt: user.created_at
      }));
    },
    createInvite({ tokenHash, role = "member", expiresAt, createdByUserId = null }) {
      const result = createInviteStmt.run(tokenHash, role, expiresAt, createdByUserId, nowIso());
      return getInviteStmt.get(tokenHash) || { id: result.lastInsertRowid, token_hash: tokenHash, role, expires_at: expiresAt };
    },
    consumeInvite({ tokenHash, at = nowIso() }) {
      const invite = getInviteStmt.get(tokenHash);
      if (!invite) return { ok: false, reason: "not_found" };
      if (invite.used_at) return { ok: false, reason: "used" };
      if (Date.parse(invite.expires_at) <= Date.parse(at)) return { ok: false, reason: "expired" };
      const result = markInviteUsedStmt.run(at, invite.id);
      if (result.changes !== 1) return { ok: false, reason: "used" };
      return { ok: true, invite: { ...invite, used_at: at } };
    },
    getSetting(key) {
      const row = getSettingStmt.get(key);
      return row ? row.value : null;
    },
    setSetting(key, value) {
      setSettingStmt.run(key, String(value), nowIso());
    },
    countRequestsSince({ userId, since }) {
      return countRequestsTodayStmt.get(userId, since).count;
    },
    createRequestLog({ id, userId, mediaType, tmdbId, arrId = null, status = "queued" }) {
      const ts = nowIso();
      insertRequestStmt.run(id, userId, mediaType, tmdbId, arrId, status, ts, ts);
      return getRequestStmt.get(id);
    },
    updateRequestLog({ id, arrId = null, status }) {
      updateRequestStmt.run(arrId, status, nowIso(), id);
      return getRequestStmt.get(id);
    },
    getRequestLog(id) {
      return getRequestStmt.get(id) || null;
    }
  };
}
