var Database = require('better-sqlite3');
var fs = require('fs');
var path = require('path');

var dbPath = '/app/data/site.db';
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

var db = new Database(dbPath);
db.pragma('journal_mode = WAL');
try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch (e) { /* ignore if empty */ }

db.exec(
  "CREATE TABLE IF NOT EXISTS chat_messages (" +
  "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
  "session_id TEXT NOT NULL, " +
  "ip TEXT, " +
  "created_at DATETIME DEFAULT CURRENT_TIMESTAMP)"
);

var actual = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(function(r) { return r.name; });
console.log("[entrypoint] DB tables: " + actual.join(', '));

db.close();
