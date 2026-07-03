import Database from "better-sqlite3";

export function createCache(path) {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  const getStmt = db.prepare("SELECT value, updated_at FROM cache_entries WHERE key = ?");
  const setStmt = db.prepare(`
    INSERT INTO cache_entries (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  return {
    get(key) {
      const row = getStmt.get(key);
      if (!row) return null;
      return { value: JSON.parse(row.value), updatedAt: row.updated_at };
    },
    set(key, value) {
      setStmt.run(key, JSON.stringify(value), Date.now());
    }
  };
}
