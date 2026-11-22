// Lapisan penyimpanan statistik PALUNG.IO.
// Memakai SQLite bawaan Node (node:sqlite, Node >= 22.5) bila tersedia,
// dan otomatis turun ke berkas JSON jika tidak. Lokasi data bisa diatur lewat
// env DATA_DIR (arahkan ke persistent disk di hosting agar data tidak hilang).
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const JSON_FILE = path.join(DATA_DIR, "runtime_stats.json");
const DB_FILE = path.join(DATA_DIR, "palung.sqlite");
const KEYS = ["answerCounts", "dailyLeaderboard", "customCategories"];

const DEFAULTS = () => ({ answerCounts: {}, dailyLeaderboard: {}, customCategories: [] });

fs.mkdirSync(DATA_DIR, { recursive: true });

let db = null;
try {
  const { DatabaseSync } = require("node:sqlite");
  db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)");
} catch (err) {
  db = null;
  console.warn("[storage] node:sqlite tidak tersedia, memakai berkas JSON:", err.message);
}

function readJsonFile() {
  try {
    if (fs.existsSync(JSON_FILE)) return JSON.parse(fs.readFileSync(JSON_FILE, "utf8"));
  } catch (err) {
    console.error("[storage] Gagal membaca runtime_stats.json:", err.message);
  }
  return null;
}

function load() {
  const data = DEFAULTS();
  if (!db) {
    return Object.assign(data, readJsonFile() || {});
  }
  const rows = db.prepare("SELECT key, value FROM kv").all();
  if (rows.length === 0) {
    // Migrasi satu kali dari runtime_stats.json lama
    const legacy = readJsonFile();
    if (legacy) {
      Object.assign(data, legacy);
      save(data);
      console.log("[storage] Data lama dimigrasikan ke SQLite.");
    }
    return data;
  }
  for (const row of rows) {
    try {
      data[row.key] = JSON.parse(row.value);
    } catch (e) {
      console.error("[storage] Data rusak untuk kunci", row.key);
    }
  }
  return data;
}

function save(data) {
  try {
    if (!db) {
      fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 2), "utf8");
      return;
    }
    const stmt = db.prepare(
      "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    );
    db.exec("BEGIN");
    try {
      const now = Date.now();
      for (const k of KEYS) stmt.run(k, JSON.stringify(data[k] ?? DEFAULTS()[k]), now);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  } catch (err) {
    console.error("[storage] Gagal menyimpan:", err.message);
  }
}

module.exports = { load, save, backend: db ? "sqlite" : "json" };
