import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

const DB_PATH = path.join(process.cwd(), "data", "site.db");

let db: Database.Database | null = null;
let tablesInitialized = false;

function initTables(database: Database.Database) {
  if (tablesInitialized) return;
  database.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  tablesInitialized = true;
}

function getDb(): Database.Database {
  if (!db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  initTables(db);
  return db;
}

export function recordChatMessage(sessionId: string, ip: string | null) {
  const database = getDb();
  database.prepare("INSERT INTO chat_messages (session_id, ip) VALUES (?, ?)").run(sessionId, ip);
}
