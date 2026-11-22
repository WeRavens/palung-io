// ============================================================================
// Lapisan Penyimpanan PALUNG.IO (Hybrid: Turso Cloud SQLite + Local SQLite/JSON)
// - Jika TURSO_DATABASE_URL & TURSO_AUTH_TOKEN diisi, data otomatis sinkron
//   secara online & permanen ke Turso Cloud (Gratis 5GB).
// - Jika belum diisi, otomatis memakai SQLite lokal (data/palung.sqlite) / JSON.
// ============================================================================
const fs = require("fs");
const path = require("path");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const JSON_FILE = path.join(DATA_DIR, "runtime_stats.json");
const DB_FILE = path.join(DATA_DIR, "palung.sqlite");
const KEYS = ["answerCounts", "dailyLeaderboard", "customCategories", "aiLearnedAnswers"];

const DEFAULTS = () => ({
  answerCounts: {},
  dailyLeaderboard: {},
  customCategories: [],
  aiLearnedAnswers: {}
});

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

// ============================================================================
// TURSO CLOUD SQLITE (HTTP PIPELINE API - ZERO EXTRA DEPENDENCIES)
// ============================================================================
function getTursoConfig() {
  const rawUrl = (process.env.TURSO_DATABASE_URL || "").trim();
  const token = (process.env.TURSO_AUTH_TOKEN || "").trim();
  if (!rawUrl || !token) return null;
  const httpUrl = rawUrl.replace(/^libsql:\/\//i, "https://").replace(/\/+$/, "");
  return { httpUrl: `${httpUrl}/v2/pipeline`, token };
}

async function tursoExecute(statements) {
  const cfg = getTursoConfig();
  if (!cfg) return null;
  const requests = statements.map((s) =>
    typeof s === "string"
      ? { type: "execute", stmt: { sql: s } }
      : { type: "execute", stmt: { sql: s.sql, args: s.args || [] } }
  );
  requests.push({ type: "close" });

  const res = await fetch(cfg.httpUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.token}`
    },
    body: JSON.stringify({ requests })
  });
  if (!res.ok) {
    throw new Error(`Turso HTTP ${res.status}`);
  }
  return res.json();
}

async function initCloudAndHydrate(runtimeData) {
  const cfg = getTursoConfig();
  if (!cfg) return false;
  try {
    await tursoExecute([
      "CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)"
    ]);
    const resp = await tursoExecute(["SELECT key, value FROM kv"]);
    const rows = resp?.results?.[0]?.response?.result?.rows || [];
    if (rows.length > 0) {
      for (const row of rows) {
        const k = row[0]?.value;
        const v = row[1]?.value;
        if (k && v && KEYS.includes(k)) {
          try {
            runtimeData[k] = JSON.parse(v);
          } catch (e) {}
        }
      }
      console.log("[storage] Data berhasil dimuat dari Turso Cloud SQLite.");
    } else {
      await saveToCloud(runtimeData);
      console.log("[storage] Inisialisasi awal data ke Turso Cloud SQLite selesai.");
    }
    return true;
  } catch (err) {
    console.warn("[storage] Gagal sinkron Turso Cloud, memakai lokal:", err.message);
    return false;
  }
}

async function saveToCloud(data) {
  const cfg = getTursoConfig();
  if (!cfg) return;
  try {
    const now = String(Date.now());
    const stmts = KEYS.map((k) => ({
      sql: "INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
      args: [
        { type: "text", value: k },
        { type: "text", value: JSON.stringify(data[k] ?? DEFAULTS()[k]) },
        { type: "integer", value: now }
      ]
    }));
    await tursoExecute(stmts);
  } catch (err) {
    console.warn("[storage] Gagal menyimpan ke Turso Cloud:", err.message);
  }
}

// ============================================================================
// LOCAL SQLITE / JSON FALLBACK
// ============================================================================
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
    } else {
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
    }
  } catch (err) {
    console.error("[storage] Gagal menyimpan lokal:", err.message);
  }

  // Sinkronkan juga ke Turso Cloud secara asynchronous jika dikonfigurasi
  if (getTursoConfig()) {
    saveToCloud(data);
  }
}

module.exports = {
  load,
  save,
  initCloudAndHydrate,
  backend: getTursoConfig() ? "turso-cloud+sqlite" : db ? "sqlite" : "json"
};
