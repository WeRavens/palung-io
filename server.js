const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const QRCode = require("qrcode");
const { Server } = require("socket.io");
const { CATEGORIES } = require("./data/categories");

// Muat file .env lokal secara aman bila ada (untuk GROQ_API_KEY di lokal; di Render pakai Env Vars)
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          const v = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (!process.env[k]) process.env[k] = v;
        }
      });
  }
} catch (err) {}

const ai = require("./ai");

function getLocalLanIp() {
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal && !net.address.startsWith("169.254.")) {
        candidates.push(net.address);
      }
    }
  }
  const preferred = candidates.find((ip) => ip.startsWith("192.168.") || ip.startsWith("10."));
  return preferred || candidates[0] || "localhost";
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Penyimpanan Statistik Kelangkaan Dinamis & Leaderboard Harian (Turso Cloud + SQLite / JSON fallback)
const storage = require("./storage");
let runtimeData = storage.load();
storage.initCloudAndHydrate(runtimeData);
console.log("[storage] backend:", storage.backend);

let saveTimer = null;
function saveRuntimeData() {
  // Gabungkan penulisan beruntun agar tidak membebani disk
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    storage.save(runtimeData);
  }, 500);
}
function flushRuntimeData() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  storage.save(runtimeData);
}
process.on("SIGTERM", () => { flushRuntimeData(); process.exit(0); });
process.on("SIGINT", () => { flushRuntimeData(); process.exit(0); });

function getAllCategories() {
  return [...CATEGORIES, ...(runtimeData.customCategories || [])];
}

function isWorkshopCategory(c) {
  return Boolean(c && (c.source === "workshop" || String(c.id || "").startsWith("custom-")));
}

function sanitizePinnedCategoryIds(rawIds) {
  if (!Array.isArray(rawIds)) return [];
  const validSet = new Set(getAllCategories().map((c) => String(c.id)));
  const cleaned = [];
  const seen = new Set();
  for (const id of rawIds) {
    const strId = String(id || "").trim();
    if (!strId || seen.has(strId) || !validSet.has(strId)) continue;
    seen.add(strId);
    cleaned.push(strId);
    if (cleaned.length >= 15) break;
  }
  return cleaned;
}

// ============================================================================
// UTILITAS NORMALISASI & FUZZY MATCHING JAWABAN
// ============================================================================
const OPTIONAL_PREFIXES = [
  "gunung ", "sungai ", "danau ", "tari ", "tarian ", "rumah ", "rumah adat ",
  "pulau ", "negara ", "buah ", "ikan ", "kain ", "alat musik ", "pahlawan ",
  "kelenjar ", "laut ", "kota ", "bahasa "
];

function normalizeText(str) {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9#+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripOptionalPrefix(normStr) {
  for (const prefix of OPTIONAL_PREFIXES) {
    if (normStr.startsWith(prefix) && normStr.length > prefix.length + 2) {
      return normStr.slice(prefix.length).trim();
    }
  }
  return normStr;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function getTierInfo(score) {
  if (score >= 89) {
    return {
      id: "LEGENDA",
      name: "LEGENDA PALUNG",
      subtitle: "Sedalam Palung, Selangka Mutiara!",
      emoji: "🟡",
      color: "#facc15"
    };
  }
  if (score >= 65) {
    return {
      id: "ABISAL",
      name: "ZONA ABISAL",
      subtitle: "Jawaban Langka",
      emoji: "🟣",
      color: "#c084fc"
    };
  }
  if (score >= 35) {
    return {
      id: "KARANG",
      name: "TERUMBU KARANG",
      subtitle: "Cukup Unik",
      emoji: "🔵",
      color: "#38bdf8"
    };
  }
  return {
    id: "PLANKTON",
    name: "ZONA PLANKTON",
    subtitle: "Jawaban Umum",
    emoji: "🟢",
    color: "#10b981"
  };
}

function getCategoryAnswersPool(category) {
  const learned = (runtimeData.aiLearnedAnswers && runtimeData.aiLearnedAnswers[category.id]) || [];
  return learned.length > 0 ? [...category.answers, ...learned] : category.answers;
}

function matchCategoryAnswer(category, rawInput) {
  const normInput = normalizeText(rawInput);
  if (!normInput || normInput.length < 1) return null;
  const strippedInput = stripOptionalPrefix(normInput);
  const pool = getCategoryAnswersPool(category);

  // 1. Exact Match (Nama utama atau alias, baik utuh maupun tanpa prefix opsional)
  for (const ans of pool) {
    const candidates = [ans.name, ...(ans.aliases || [])];
    for (const cand of candidates) {
      const normCand = normalizeText(cand);
      const strippedCand = stripOptionalPrefix(normCand);
      if (
        normInput === normCand ||
        strippedInput === strippedCand ||
        normInput === strippedCand ||
        strippedInput === normCand
      ) {
        return computeDynamicScore(category.id, ans);
      }
    }
  }

  // 2. Fuzzy Match (Toleransi salah ketik tipis untuk kata >= 5 huruf)
  let bestMatch = null;
  let bestDist = 99;

  for (const ans of pool) {
    const candidates = [ans.name, ...(ans.aliases || [])];
    for (const cand of candidates) {
      const normCand = normalizeText(cand);
      const strippedCand = stripOptionalPrefix(normCand);

      for (const target of [normCand, strippedCand]) {
        if (target.length < 5 || strippedInput.length < 4) continue;
        const maxAllowed = target.length >= 8 ? 2 : 1;
        const dist = levenshtein(strippedInput, target);
        if (dist <= maxAllowed && dist < bestDist) {
          bestDist = dist;
          bestMatch = ans;
        }
      }
    }
  }

  if (bestMatch) {
    return computeDynamicScore(category.id, bestMatch);
  }

  return null;
}

function computeDynamicScore(categoryId, ansObj) {
  // Sedikit penyesuaian dinamis berdasarkan seberapa sering jawaban ini dipilih pemain
  const key = `${categoryId}::${ansObj.name}`;
  const timesPicked = runtimeData.answerCounts[key] || 0;
  // Penalti maksimal 6 poin jika jawaban sangat sering dipilih oleh pemain
  const dynamicAdjustment = Math.min(6, Math.floor(timesPicked / 5));
  const finalBaseScore = Math.max(10, ansObj.score - dynamicAdjustment);
  const tier = getTierInfo(finalBaseScore);

  return {
    canonicalName: ansObj.name,
    baseScore: finalBaseScore,
    fact: ansObj.fact,
    tier
  };
}

// ============================================================================
// KONFIGURASI AI BOT PENYELAM PINTAR
// ============================================================================
const BOT_PROFILES = [
  {
    id: "bot-budi",
    name: "Kapten Budi",
    avatar: "🤿",
    color: "#38bdf8",
    style: "safe", // Suka jawaban Plankton & Karang, jawab cepat
    desc: "Suka cari aman & jawab cepat"
  },
  {
    id: "bot-nadya",
    name: "Prof. Nadya",
    avatar: "🐙",
    color: "#c084fc",
    style: "scholar", // Suka jawaban Abisal & Legenda
    desc: "Ahli ensiklopedia laut dalam"
  },
  {
    id: "bot-riko",
    name: "Riko Kilat",
    avatar: "⚡",
    color: "#facc15",
    style: "speed", // Jawab sangat cepat, tingkat kelangkaan acak
    desc: "Menekan tombol secepat kilat"
  },
  {
    id: "bot-siska",
    name: "Siska Anti-Mainstream",
    avatar: "🦈",
    color: "#f43f5e",
    style: "hipster", // Menghindari Plankton agar tidak tabrakan
    desc: "Anti jawaban pasaran!"
  }
];

function pickBotAnswer(bot, category, tide = false) {
  const answers = category.answers;
  let pool = answers;

  if (bot.style === "safe") {
    pool = answers.filter((a) => a.score <= 58);
  } else if (bot.style === "scholar") {
    pool = answers.filter((a) => a.score >= 52);
  } else if (bot.style === "hipster") {
    pool = answers.filter((a) => a.score >= 38 && a.score <= 94);
  }

  if (tide) {
    // Arus Pasang: bot mengikuti arus, memilih jawaban umum
    pool = answers.filter((a) => a.score <= 45);
  }
  if (!pool || pool.length === 0) pool = answers;
  const chosen = pool[Math.floor(Math.random() * pool.length)];
  return computeDynamicScore(category.id, chosen);
}

// ============================================================================
// SISTEM TANTANGAN HARIAN (DAILY DIVE DETERMINISTIK)
// ============================================================================
function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function seededRandom(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967296;
  };
}

function getDailyCategories(dateKey = getTodayKey()) {
  const all = [...CATEGORIES];
  const rng = seededRandom(`PALUNG-DAILY-${dateKey}`);
  const shuffled = [...all].sort(() => rng() - 0.5);
  return shuffled.slice(0, 7);
}

// ============================================================================
// MANAJEMEN ROOM MULTIPLAYER
// ============================================================================
const rooms = new Map();

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms.has(code));
  return code;
}

const SUBMARINE_COLORS = [
  "#38bdf8", "#10b981", "#f43f5e", "#facc15",
  "#c084fc", "#fb923c", "#2dd4bf", "#a3e635"
];

function normalizeRoomThemes(themeInput) {
  const validThemes = new Set(["sains", "nusantara", "geografi", "umum", "workshop", ...getAllCategories().map((c) => c.theme)]);
  const rawList = Array.isArray(themeInput)
    ? themeInput
    : typeof themeInput === "string"
    ? themeInput.split(",")
    : [];
  const cleaned = [];
  const seen = new Set();
  for (const item of rawList) {
    const t = String(item || "").trim().toLowerCase();
    if (!t || seen.has(t)) continue;
    if (t === "all") return { theme: "all", themes: ["all"] };
    if (validThemes.has(t)) {
      seen.add(t);
      cleaned.push(t);
    }
  }
  const coreThemes = ["sains", "nusantara", "geografi", "umum"];
  if (cleaned.length === 0 || coreThemes.every((t) => seen.has(t))) {
    return { theme: "all", themes: ["all"] };
  }
  return { theme: cleaned.join(","), themes: cleaned };
}

function createRoom({
  hostSocketId,
  hostName,
  hostAvatar,
  isPublic = true,
  isDaily = false,
  settings = {}
}) {
  const code = generateRoomCode();
  const normalizedThemes = isDaily
    ? { theme: "all", themes: ["all"] }
    : normalizeRoomThemes(settings.themes || settings.theme);
  const room = {
    code,
    hostId: hostSocketId,
    isPublic: Boolean(isPublic),
    isDaily: Boolean(isDaily),
    state: "LOBBY", // LOBBY | PLAYING | REVEAL | GAMEOVER
    settings: {
      roundsTotal: isDaily ? 7 : Math.min(15, Math.max(3, Math.round(Number(settings.roundsTotal)) || 7)),
      roundDuration: isDaily ? 25 : Math.min(60, Math.max(10, Math.round(Number(settings.roundDuration)) || 25)),
      maxPlayers: isDaily ? 8 : Math.min(20, Math.max(2, Math.round(Number(settings.maxPlayers)) || 8)),
      theme: normalizedThemes.theme,
      themes: normalizedThemes.themes,
      pinnedCategoryIds: isDaily ? [] : sanitizePinnedCategoryIds(settings.pinnedCategoryIds),
      collisionRule: isDaily ? false : settings.collisionRule !== false,
      gameMode: isDaily ? "daily" : ["competitive", "coop", "tide", "puffer"].includes(settings.gameMode) ? settings.gameMode : "competitive"
    },
    players: [],
    currentRound: 0,
    selectedCategories: [],
    roundStartTime: 0,
    roundDeadline: 0,
    roundSubmissions: {}, // playerId -> { rawInput, match, submittedAt }
    roundHistory: [],
    timerInterval: null,
    revealTimeout: null,
    botTimeouts: []
  };

  if (hostSocketId) {
    addPlayerToRoom(room, {
      id: hostSocketId,
      name: hostName || "Penyelam 1",
      avatar: hostAvatar || "🤿",
      isBot: false
    });
  }

  rooms.set(code, room);
  scheduleLobbyAutoDisband(room);
  return room;
}

const LOBBY_IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit tidak dimulai -> bubar otomatis

function clearLobbyIdleTimer(room) {
  if (room && room.lobbyIdleTimer) {
    clearTimeout(room.lobbyIdleTimer);
    room.lobbyIdleTimer = null;
  }
}

function scheduleLobbyAutoDisband(room) {
  clearLobbyIdleTimer(room);
  if (!room || room.state !== "LOBBY" || room.isDaily) return;
  room.lobbyIdleTimer = setTimeout(() => {
    if (!rooms.has(room.code) || room.state !== "LOBBY") return;
    clearRoomTimers(room);
    io.to(room.code).emit("room:disbanded", {
      code: room.code,
      reason: "Room dibubarkan otomatis karena tidak dimulai selama lebih dari 15 menit."
    });
    rooms.delete(room.code);
    broadcastPublicRooms();
  }, LOBBY_IDLE_TIMEOUT_MS);
}

function getPublicRoomsList() {
  const list = [];
  rooms.forEach((r) => {
    if (r.isPublic && !r.isDaily && r.state === "LOBBY") {
      list.push({
        code: r.code,
        hostName: r.players[0] ? r.players[0].name : "Kapten",
        playerCount: r.players.length,
        maxPlayers: r.settings.maxPlayers || 8,
        theme: r.settings.theme,
        gameMode: r.settings.gameMode
      });
    }
  });
  return list;
}

function broadcastPublicRooms() {
  io.emit("public:rooms:update", getPublicRoomsList());
}

function addPlayerToRoom(room, { id, name, avatar, isBot = false, botProfile = null }) {
  const existing = room.players.find((p) => p.id === id);
  if (existing) return existing;

  const color =
    (botProfile && botProfile.color) ||
    SUBMARINE_COLORS[room.players.length % SUBMARINE_COLORS.length];

  const player = {
    id,
    name: (name || "Penyelam").slice(0, 22),
    avatar: avatar || "🤿",
    color,
    isBot,
    botProfile,
    totalDepth: 0,
    roundDepth: 0,
    readyInRound: false,
    lobbyReady: isBot, // Host & bot siap; pemain lain menekan tombol Siap/Ready
    oxygen: 100, // Oksigen kapal selam (0-100): jawaban umum menguras, jawaban langka mengisi
    sonarPings: 2, // Sonar Ping: bocoran huruf awal jawaban langka (2x per game)
    sonarUsedRound: 0,
    rerollsLeft: 1, // Fitur Sonar Cadangan: 1x kesempatan ganti jawaban per game!
    historyTiers: [], // Array emoji tier tiap ronde
    bestAnswer: null,
    collisionsCount: 0,
    uniqueBonusCount: 0
  };

  room.players.push(player);
  return player;
}

const OXYGEN_MISS_PENALTY = 30;
const OXYGEN_BY_TIER = { PLANKTON: -12, KARANG: -4, ABISAL: 6, LEGENDA: 12 };
const SONAR_PING_COST = 15;

function clearRoomTimers(room) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
  if (room.revealTimeout) {
    clearTimeout(room.revealTimeout);
    room.revealTimeout = null;
  }
  if (room.megalodonMidTimer) {
    clearTimeout(room.megalodonMidTimer);
    room.megalodonMidTimer = null;
  }
  if (room.botTimeouts && room.botTimeouts.length) {
    room.botTimeouts.forEach((t) => clearTimeout(t));
    room.botTimeouts = [];
  }
}

function serializeRoom(room) {
  const currentCat =
    room.selectedCategories[room.currentRound - 1] || null;

  return {
    code: room.code,
    hostId: room.hostId,
    isPublic: room.isPublic,
    isDaily: room.isDaily,
    state: room.state,
    settings: room.settings,
    currentRound: room.currentRound,
    roundsTotal: room.settings.roundsTotal,
    roundDeadline: room.roundDeadline,
    serverNow: Date.now(),
    category: currentCat
      ? {
          id: currentCat.id,
          title: currentCat.title,
          theme: currentCat.theme,
          hint: currentCat.hint,
          educationalNote: currentCat.educationalNote,
          totalPossibleAnswers: currentCat.answers.length
        }
      : null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      isBot: p.isBot,
      totalDepth: p.totalDepth,
      roundDepth: p.roundDepth,
      readyInRound: p.readyInRound,
      lobbyReady: Boolean(p.lobbyReady || p.id === room.hostId),
      rerollsLeft: p.rerollsLeft,
      oxygen: p.oxygen,
      sonarPings: p.sonarPings,
      historyTiers: p.historyTiers,
      bestAnswer: p.bestAnswer,
      collisionsCount: p.collisionsCount,
      uniqueBonusCount: p.uniqueBonusCount
    }))
  };
}

function broadcastRoomUpdate(room) {
  io.to(room.code).emit("room:update", serializeRoom(room));
  broadcastPublicRooms();
}

const recentPlayedCategoryIds = [];
let isExpandingAiBank = false;

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

async function expandQuestionBankWithAI(preferredTheme = "all") {
  if (!ai.isEnabled() || isExpandingAiBank) return;
  if ((runtimeData.customCategories || []).length >= 100) return;
  isExpandingAiBank = true;
  try {
    const existingTitles = getAllCategories().map((c) => c.title);
    const generated = await ai.generateRandomCategoryWithAI(existingTitles, preferredTheme);
    if (!generated || !Array.isArray(generated.answers) || generated.answers.length < 4) return;
    if (!runtimeData.customCategories) runtimeData.customCategories = [];
    const newCat = {
      id: `ai-auto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      theme: generated.theme || "umum",
      title: generated.title,
      hint: generated.hint,
      educationalNote: generated.educationalNote,
      createdBy: "Sonar AI Auto",
      answers: generated.answers
    };
    runtimeData.customCategories.push(newCat);
    saveRuntimeData();
    console.log(`[AI Bank] Kategori baru ditambahkan otomatis: "${newCat.title}" (${newCat.answers.length} jawaban via ${generated.modelUsed})`);
  } catch (err) {
    console.warn("[AI Bank] Gagal menambah soal otomatis:", err.message);
  } finally {
    isExpandingAiBank = false;
  }
}

function selectCategoriesForRoom(room) {
  if (room.isDaily) {
    return getDailyCategories(getTodayKey());
  }
  const all = getAllCategories();
  const catById = new Map(all.map((c) => [String(c.id), c]));

  // Pasang soal pilihan host (misalnya dari Workshop) terlebih dahulu mulai Ronde 1
  const pinnedCats = [];
  const pinnedIdSet = new Set();
  for (const pid of room.settings.pinnedCategoryIds || []) {
    const cat = catById.get(String(pid));
    if (cat && !pinnedIdSet.has(cat.id)) {
      pinnedIdSet.add(cat.id);
      pinnedCats.push(cat);
      if (pinnedCats.length >= room.settings.roundsTotal) break;
    }
  }

  const remainingNeeded = Math.max(0, room.settings.roundsTotal - pinnedCats.length);
  const remainingPool = all.filter((c) => !pinnedIdSet.has(c.id));

  let filtered = remainingPool;
  const activeThemes =
    Array.isArray(room.settings.themes) && room.settings.themes.length
      ? room.settings.themes
      : room.settings.theme && room.settings.theme !== "all"
      ? String(room.settings.theme)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : ["all"];
  if (!activeThemes.includes("all")) {
    const themeSet = new Set(activeThemes);
    filtered = remainingPool.filter((c) => themeSet.has(c.theme) || (themeSet.has("workshop") && isWorkshopCategory(c)));
  }

  // Prioritaskan soal Workshop & AI baru serta soal yang belum muncul baru-baru ini!
  const recentSet = new Set(recentPlayedCategoryIds);
  const workshopFreshAll = filtered
    .filter((c) => isWorkshopCategory(c) && !recentSet.has(c.id))
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const pickedWorkshop = workshopFreshAll.slice(0, Math.min(remainingNeeded, 2));
  const pickedWsIds = new Set(pickedWorkshop.map((c) => c.id));

  const aiFreshAll = shuffleArray(
    filtered.filter((c) => !pickedWsIds.has(c.id) && String(c.id).startsWith("ai-") && !recentSet.has(c.id))
  );
  const pickedAi = aiFreshAll.slice(0, Math.min(Math.max(0, remainingNeeded - pickedWorkshop.length), 2));
  const pickedEarlyIds = new Set([...pickedWsIds, ...pickedAi.map((c) => c.id)]);

  const staticFresh = shuffleArray(
    filtered.filter(
      (c) => !pickedEarlyIds.has(c.id) && !isWorkshopCategory(c) && !String(c.id).startsWith("ai-") && !recentSet.has(c.id)
    )
  );
  const extraWorkshop = workshopFreshAll.slice(pickedWorkshop.length);
  const extraAi = aiFreshAll.slice(pickedAi.length);
  const stalePool = shuffleArray(filtered.filter((c) => !pickedEarlyIds.has(c.id) && recentSet.has(c.id)));

  const restFiltered = [...staticFresh, ...extraWorkshop, ...extraAi, ...stalePool];
  const fillSelected = [...pickedWorkshop, ...pickedAi, ...restFiltered].slice(0, remainingNeeded);

  // Jika tema terpilih memiliki lebih sedikit soal dari jumlah ronde, lengkapi kekurangannya saja dari bank lain
  if (fillSelected.length < remainingNeeded) {
    const fillIdSet = new Set(fillSelected.map((c) => c.id));
    const topUp = shuffleArray(remainingPool.filter((c) => !fillIdSet.has(c.id))).slice(
      0,
      remainingNeeded - fillSelected.length
    );
    fillSelected.push(...topUp);
  }

  const picked = [...pinnedCats, ...shuffleArray(fillSelected)];

  picked.forEach((c) => {
    const idx = recentPlayedCategoryIds.indexOf(c.id);
    if (idx !== -1) recentPlayedCategoryIds.splice(idx, 1);
    recentPlayedCategoryIds.push(c.id);
    if (recentPlayedCategoryIds.length > 42) recentPlayedCategoryIds.shift();
  });

  return picked;
}

function startGame(room) {
  clearRoomTimers(room);
  room.state = "PLAYING";
  room.currentRound = 0;
  room.roundHistory = [];
  room.selectedCategories = selectCategoriesForRoom(room);
  room.settings.roundsTotal = room.selectedCategories.length;

  // Perbanyak soal di background menggunakan Cloudflare Worker AI tanpa menunda mulai game
  const aiSeedThemes =
    Array.isArray(room.settings.themes) && room.settings.themes.length
      ? room.settings.themes
      : ["all"];
  const pickedAiTheme = aiSeedThemes[Math.floor(Math.random() * aiSeedThemes.length)] || "all";
  expandQuestionBankWithAI(pickedAiTheme);

  room.players.forEach((p) => {
    p.totalDepth = 0;
    p.roundDepth = 0;
    p.readyInRound = false;
    p.rerollsLeft = 1;
    p.oxygen = 100;
    p.sonarPings = 2;
    p.sonarUsedRound = 0;
    p.historyTiers = [];
    p.bestAnswer = null;
    p.collisionsCount = 0;
    p.uniqueBonusCount = 0;
  });

  startNextRound(room);
}

function startNextRound(room) {
  clearRoomTimers(room);
  room.currentRound += 1;

  if (room.currentRound > room.selectedCategories.length) {
    finishGame(room);
    return;
  }

  room.state = "PLAYING";
  room.aiGraceDeadline = null;
  room.roundSubmissions = {};
  room.players.forEach((p) => {
    p.readyInRound = false;
    p.roundDepth = 0;
    p.isCheckingAi = false;
  });

  const durationMs = (room.settings.roundDuration || 25) * 1000;
  room.roundStartTime = Date.now();
  room.roundDeadline = room.roundStartTime + durationMs;

  const currentCat = room.selectedCategories[room.currentRound - 1];

  broadcastRoomUpdate(room);
  io.to(room.code).emit("round:start", {
    round: room.currentRound,
    roundsTotal: room.settings.roundsTotal,
    deadline: room.roundDeadline,
    serverNow: Date.now(),
    category: {
      id: currentCat.id,
      title: currentCat.title,
      theme: currentCat.theme,
      hint: currentCat.hint,
      educationalNote: currentCat.educationalNote,
      totalPossibleAnswers: currentCat.answers.length
    }
  });

  // Serangan Tengah Ronde (Panic Bite) untuk mode Teror Megalodon!
  if (room.settings.gameMode === "puffer") {
    room.megalodonMidTimer = setTimeout(() => {
      if (room.state !== "PLAYING") return;
      const bittenIds = [];
      room.players.forEach((p) => {
        if (!p.isBot && !room.roundSubmissions[p.id]) {
          p.oxygen = Math.max(0, p.oxygen - 10);
          bittenIds.push(p.id);
        }
      });
      if (bittenIds.length > 0) {
        broadcastRoomUpdate(room);
      }
      io.to(room.code).emit("megalodon:panic", { bittenIds });
    }, Math.floor(durationMs * 0.5));
  }

  // Jadwalkan jawaban AI Bot
  room.players
    .filter((p) => p.isBot)
    .forEach((bot) => {
      let minDelay = 4500;
      let maxDelay = Math.min(18000, durationMs - 3000);
      if (bot.botProfile && bot.botProfile.style === "speed") {
        minDelay = 2800;
        maxDelay = 7500;
      } else if (bot.botProfile && bot.botProfile.style === "scholar") {
        minDelay = 7000;
        maxDelay = Math.min(20000, durationMs - 2500);
      }
      const delay = Math.floor(minDelay + Math.random() * Math.max(1000, maxDelay - minDelay));
      const t = setTimeout(() => {
        if (room.state !== "PLAYING") return;
        const match = pickBotAnswer(bot.botProfile || { style: "safe" }, currentCat, room.settings.gameMode === "tide");
        room.roundSubmissions[bot.id] = {
          rawInput: match.canonicalName,
          match,
          submittedAt: Date.now()
        };
        bot.readyInRound = true;
        broadcastRoomUpdate(room);
        checkIfAllPlayersReady(room);
      }, delay);
      room.botTimeouts.push(t);
    });

  // Timer cek batas waktu (+ grace period maks 3 detik bila ada pemain masih menunggu koreksi AI)
  room.timerInterval = setInterval(() => {
    const now = Date.now();
    if (now >= room.roundDeadline) {
      const anyoneCheckingAi = room.players.some((p) => !p.isBot && p.isCheckingAi);
      if (anyoneCheckingAi) {
        if (!room.aiGraceDeadline) {
          room.aiGraceDeadline = now + 3000;
        }
        if (now < room.aiGraceDeadline) {
          return;
        }
      }
      clearInterval(room.timerInterval);
      room.timerInterval = null;
      room.aiGraceDeadline = null;
      endRoundAndReveal(room);
    }
  }, 250);
}

function checkIfAllPlayersReady(room) {
  if (room.state !== "PLAYING") return;
  const allReady = room.players.length > 0 && room.players.every((p) => p.readyInRound);
  if (allReady) {
    clearRoomTimers(room);
    setTimeout(() => {
      if (room.state === "PLAYING") {
        endRoundAndReveal(room);
      }
    }, 600);
  }
}

function endRoundAndReveal(room) {
  if (room.state !== "PLAYING") return;
  clearRoomTimers(room);
  room.state = "REVEAL";

  const currentCat = room.selectedCategories[room.currentRound - 1];

  // Jika ada pemain manusia yang OFFLINE/TERPUTUS (bukan yang masih online) dan belum mengirim jawaban,
  // Bot otomatis menggantikan dengan jawaban umum/biasa (skor <= 45, bukan super langka).
  if (currentCat) {
    room.players.forEach((p) => {
      if (!p.isBot && p.disconnected && !room.roundSubmissions[p.id]) {
        const afkMatch = pickBotAnswer({ style: "safe" }, currentCat, true);
        if (afkMatch) {
          room.roundSubmissions[p.id] = {
            rawInput: afkMatch.canonicalName,
            match: afkMatch,
            aiModelUsed: "Bot AFK",
            isAfkBot: true
          };
        }
      }
    });
  }

  // Hitung frekuensi tiap jawaban canonical di dalam room untuk mendeteksi TABRAKAN!
  const canonicalCounts = {};
  Object.values(room.roundSubmissions).forEach((sub) => {
    if (sub && sub.match) {
      const cName = sub.match.canonicalName;
      canonicalCounts[cName] = (canonicalCounts[cName] || 0) + 1;
    }
  });

  // Cek apakah ada pemain yang mencapai tier tinggi sendirian (Penemu Tunggal)
  const highTierSubmissions = Object.entries(room.roundSubmissions).filter(
    ([, sub]) => sub && sub.match && sub.match.baseScore >= 65 && canonicalCounts[sub.match.canonicalName] === 1
  );
  const isTide = room.settings.gameMode === "tide";
  let soleExplorerPlayerId = null;
  if (!isTide && room.players.length >= 2 && highTierSubmissions.length > 0) {
    // Berikan badge Penemu Tunggal kepada jawaban unik dengan skor tertinggi di ronde ini
    highTierSubmissions.sort((a, b) => b[1].match.baseScore - a[1].match.baseScore);
    soleExplorerPlayerId = highTierSubmissions[0][0];
  }

  const results = [];
  let rarestGuessed = null;

  room.players.forEach((p) => {
    const sub = room.roundSubmissions[p.id];
    if (!sub || !sub.match) {
      const o0 = p.oxygen;
      p.oxygen = Math.max(0, p.oxygen - OXYGEN_MISS_PENALTY);
      p.roundDepth = 0;
      p.historyTiers.push("⚫");
      results.push({
        playerId: p.id,
        playerName: p.name,
        playerAvatar: p.avatar,
        playerColor: p.color,
        answered: false,
        rawInput: "",
        canonicalName: "Kehabisan Oksigen (Tidak Menjawab)",
        baseScore: 0,
        depthGained: 0,
        totalDepth: p.totalDepth,
        tier: {
          id: "MISSED",
          name: "KEHABISAN WAKTU",
          subtitle: "0 Meter",
          emoji: "⚫",
          color: "#64748b"
        },
        isCollision: false,
        isSoleExplorer: false,
        oxygenDelta: p.oxygen - o0,
        oxygenAfter: p.oxygen,
        suffocating: false,
        fact: ""
      });
      return;
    }

    const { canonicalName, baseScore, fact, tier } = sub.match;

    // Catat statistik global jika bukan bot
    if (!p.isBot) {
      const statKey = `${currentCat.id}::${canonicalName}`;
      runtimeData.answerCounts[statKey] = (runtimeData.answerCounts[statKey] || 0) + 1;
    }

    const isCollision =
      (isTide || room.settings.collisionRule) &&
      room.players.length >= 2 &&
      canonicalCounts[canonicalName] > 1;

    const isSoleExplorer = p.id === soleExplorerPlayerId && !isCollision;

    let depthGained = baseScore * 10; // 1 poin = 10 meter
    if (isTide) {
      // Arus Pasang: makin umum jawabanmu, makin dalam; sama dengan pemain lain = bonus 50%
      depthGained = (100 - baseScore) * 10 + 100;
      if (isCollision) {
        depthGained = Math.round(depthGained * 1.5);
        p.collisionsCount += 1;
      }
    } else if (isCollision) {
      depthGained = Math.round(depthGained * 0.5); // Penalti Tabrakan 50%!
      p.collisionsCount += 1;
    }
    if (isSoleExplorer) {
      depthGained += 150; // Bonus +150m Penemu Tunggal!
      p.uniqueBonusCount += 1;
    }

    // Sistem Oksigen: kehabisan napas memangkas hasil selam 30%
    const suffocating = !isTide && p.oxygen <= 0;
    if (suffocating) depthGained = Math.round(depthGained * 0.7);
    const o0 = p.oxygen;
    let oxDelta = isTide ? 0 : OXYGEN_BY_TIER[tier.id] || 0;
    if (isCollision && !isTide) oxDelta -= 10;
    p.oxygen = Math.max(0, Math.min(100, p.oxygen + oxDelta));

    p.roundDepth = depthGained;
    p.totalDepth += depthGained;
    p.historyTiers.push(isCollision ? "💥" : tier.emoji);

    if (!p.bestAnswer || depthGained > p.bestAnswer.depthGained) {
      p.bestAnswer = {
        categoryTitle: currentCat.title,
        answerName: canonicalName,
        depthGained,
        tierEmoji: tier.emoji,
        tierName: tier.name,
        fact
      };
    }

    if (!rarestGuessed || baseScore > rarestGuessed.baseScore) {
      rarestGuessed = {
        canonicalName,
        baseScore,
        fact,
        tier,
        finderName: p.name
      };
    }

    results.push({
      playerId: p.id,
      playerName: p.name,
      playerAvatar: p.avatar,
      playerColor: p.color,
      answered: true,
      rawInput: sub.rawInput,
      canonicalName,
      baseScore,
      depthGained,
      totalDepth: p.totalDepth,
      tier,
      isCollision,
      collisionWithCount: canonicalCounts[canonicalName],
      isSoleExplorer,
      oxygenDelta: p.oxygen - o0,
      oxygenAfter: p.oxygen,
      suffocating,
      fact
    });
  });

  // Mode Teror Megalodon (Radar Kebisingan): hanya jawaban pasaran (<=45), tabrakan, atau telat yang memancing Megalodon!
  // Jawaban langka (>45 tanpa tabrakan) = senyap/stealth sehingga aman dari sergapan!
  let pufferEvent = null;
  if (room.settings.gameMode === "puffer" && results.length >= 2) {
    const noisyCandidates = results
      .filter((r) => !r.answered || r.isCollision || r.baseScore <= 45)
      .sort((a, b) => {
        if (a.answered !== b.answered) return a.answered ? 1 : -1;
        if (a.isCollision !== b.isCollision) return a.isCollision ? -1 : 1;
        return a.baseScore - b.baseScore;
      });
    const victimRes = noisyCandidates[0];
    const victimPlayer = victimRes
      ? room.players.find((p) => p.id === victimRes.playerId)
      : null;
    if (victimPlayer) {
      victimPlayer.totalDepth = Math.max(0, victimPlayer.totalDepth - 150);
      victimPlayer.oxygen = Math.max(0, victimPlayer.oxygen - 18);
      victimRes.depthGained = Math.max(0, victimRes.depthGained - 150);
      victimRes.totalDepth = victimPlayer.totalDepth;
      victimRes.oxygenAfter = victimPlayer.oxygen;
      victimRes.oxygenDelta -= 18;
      victimRes.pufferExploded = true;
      pufferEvent = {
        victimId: victimPlayer.id,
        victimName: victimPlayer.name,
        victimAvatar: victimPlayer.avatar
      };
    }
  }

  saveRuntimeData();

  // Urutkan hasil ronde dari kedalaman tertinggi di ronde ini
  results.sort((a, b) => b.depthGained - a.depthGained);

  // Ambil 3 jawaban Legenda Palung dari kategori ini sebagai Wawasan Tambahan
  const legendaryExamples = [...currentCat.answers]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => ({
      name: a.name,
      score: a.score,
      depthMeters: a.score * 10,
      fact: a.fact
    }));

  const revealPayload = {
    round: room.currentRound,
    roundsTotal: room.settings.roundsTotal,
    categoryTitle: currentCat.title,
    educationalNote: currentCat.educationalNote,
    results,
    rarestGuessed,
    pufferEvent,
    legendaryExamples,
    nextRoundInMs: 13500
  };

  room.roundHistory.push(revealPayload);

  broadcastRoomUpdate(room);
  io.to(room.code).emit("round:reveal", revealPayload);

  room.revealTimeout = setTimeout(() => {
    startNextRound(room);
  }, 13500);
}

function finishGame(room) {
  clearRoomTimers(room);
  room.state = "GAMEOVER";

  const standings = [...room.players].sort((a, b) => b.totalDepth - a.totalDepth);
  const teamTotalDepth = room.players.reduce((acc, p) => acc + p.totalDepth, 0);

  // Jika mode Tantangan Harian, simpan skor pemain manusia ke Daily Leaderboard
  if (room.isDaily) {
    const todayKey = getTodayKey();
    if (!runtimeData.dailyLeaderboard[todayKey]) {
      runtimeData.dailyLeaderboard[todayKey] = [];
    }
    const board = runtimeData.dailyLeaderboard[todayKey];
    room.players
      .filter((p) => !p.isBot)
      .forEach((p) => {
        board.push({
          name: p.name,
          avatar: p.avatar,
          totalDepth: p.totalDepth,
          tiers: p.historyTiers.join(""),
          bestAnswer: p.bestAnswer ? p.bestAnswer.answerName : "-",
          timestamp: Date.now()
        });
      });
    board.sort((a, b) => b.totalDepth - a.totalDepth);
    runtimeData.dailyLeaderboard[todayKey] = board.slice(0, 50);
    saveRuntimeData();
  }

  broadcastRoomUpdate(room);
  io.to(room.code).emit("game:over", {
    isDaily: room.isDaily,
    dateKey: getTodayKey(),
    gameMode: room.settings.gameMode,
    standings,
    teamTotalDepth,
    roundHistory: room.roundHistory
  });
}

// ============================================================================
// REST API ENDPOINTS (LEADERBOARD, STATS, CUSTOM CATEGORY, ROOM LIST)
// ============================================================================
app.get("/api/info", (req, res) => {
  const todayKey = getTodayKey();
  const publicRooms = [];
  rooms.forEach((r) => {
    if (r.isPublic && !r.isDaily && r.state === "LOBBY") {
      publicRooms.push({
        code: r.code,
        hostName: r.players[0] ? r.players[0].name : "Kapten",
        playerCount: r.players.length,
        maxPlayers: r.settings.maxPlayers || 8,
        theme: r.settings.theme,
        gameMode: r.settings.gameMode
      });
    }
  });

  const lanIp = getLocalLanIp();
  const port = process.env.PORT || 3000;
  res.json({
    todayKey,
    lanIp,
    lanUrl: `http://${lanIp}:${port}`,
    totalCategories: getAllCategories().length,
    totalAnswers: getAllCategories().reduce((sum, c) => sum + c.answers.length, 0),
    publicRooms,
    dailyLeaderboard: (runtimeData.dailyLeaderboard[todayKey] || []).slice(0, 15)
  });
});

// Endpoint QR Code Standar ISO (Bisa langsung di-scan kamera HP / Google Lens tanpa ketik URL!)
app.get("/api/qr", async (req, res) => {
  try {
    const text = (req.query.text || `http://${getLocalLanIp()}:${process.env.PORT || 3000}`).toString();
    const dataUrl = await QRCode.toDataURL(text, {
      width: 240,
      margin: 1,
      color: {
        dark: "#040d1a",
        light: "#ffffff"
      }
    });
    res.json({ dataUrl, text });
  } catch (err) {
    res.status(500).json({ error: "Gagal membuat QR Code" });
  }
});

// Short-link /apk untuk langsung mengunduh file PALUNG-IO.apk
app.get("/apk", (req, res) => {
  res.redirect("/PALUNG-IO.apk");
});

// Short-link /r/ABCD agar link undangan room singkat & mudah dibagikan
app.get("/r/:code", (req, res) => {
  const code = (req.params.code || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  res.redirect(`/?room=${code}`);
});

// Status & Generator Kategori Groq AI Multi-Model
app.get("/api/ai/status", (req, res) => {
  res.json(ai.getAiStatus());
});

app.post("/api/ai/generate-category", async (req, res) => {
  const { topic, theme } = req.body || {};
  if (!topic || String(topic).trim().length < 2) {
    return res.status(400).json({ error: "Masukkan topik kategori terlebih dahulu." });
  }
  if (!ai.isEnabled()) {
    return res.status(503).json({
      error: "GROQ_API_KEY belum terpasang di server. Tambahkan GROQ_API_KEY di .env atau Environment Variable."
    });
  }
  try {
    const generated = await ai.generateCategoryWithAI(String(topic).trim(), theme || "umum");
    res.json({ success: true, ...generated });
  } catch (err) {
    res.status(502).json({ error: `Gagal generate kategori via Groq AI: ${err.message}` });
  }
});

// Sitemap XML dinamis untuk indeks Google Search Console
app.get("/sitemap.xml", (req, res) => {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.get("host") || "palung.io";
  const baseUrl = `${proto}://${host}`;
  res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`);
});

app.get("/api/categories", (req, res) => {
  const list = getAllCategories().map((c) => ({
    id: c.id,
    title: c.title,
    theme: c.theme,
    hint: c.hint,
    answerCount: c.answers.length,
    source: isWorkshopCategory(c) ? "workshop" : String(c.id || "").startsWith("ai-") ? "ai" : "builtin",
    createdBy: c.createdBy || null,
    createdAt: c.createdAt || 0
  }));
  const workshopCategories = list
    .filter((c) => c.source === "workshop")
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  res.json({ categories: list, workshopCategories });
});

const customRate = new Map(); // ip -> [timestamps]
function clip(v, n) { return String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n); }

app.post("/api/categories/custom", (req, res) => {
  const ip = req.ip || "x";
  const now = Date.now();
  const hits = (customRate.get(ip) || []).filter((t) => now - t < 3600000);
  if (hits.length >= 25) {
    return res.status(429).json({ error: "Terlalu banyak kategori dibuat. Coba lagi dalam satu jam." });
  }
  const { title, theme, hint, educationalNote, answers, createdBy } = req.body || {};
  if (!title || !Array.isArray(answers) || answers.length < 4) {
    return res.status(400).json({
      error: "Masukkan judul kategori dan minimal 4 jawaban beserta skor kelangkaannya."
    });
  }
  if (!Array.isArray(runtimeData.customCategories)) runtimeData.customCategories = [];
  if (runtimeData.customCategories.length >= 500) {
    return res.status(503).json({ error: "Workshop sedang penuh." });
  }

  const id = "custom-" + now + "-" + Math.random().toString(36).slice(2, 6);
  const cleanAnswers = answers
    .slice(0, 100)
    .filter((a) => a && a.name && String(a.name).trim())
    .map((a) => ({
      name: clip(a.name, 60),
      aliases: Array.isArray(a.aliases) ? a.aliases.slice(0, 10).map((x) => clip(x, 60)).filter(Boolean) : [],
      score: Math.min(100, Math.max(10, Number(a.score) || 50)),
      fact: clip(a.fact || "Jawaban kustom dari komunitas Palung.io!", 300)
    }));
  if (cleanAnswers.length < 4) {
    return res.status(400).json({ error: "Minimal 4 jawaban valid." });
  }

  const newCat = {
    id,
    title: clip(title, 80),
    theme: clip(theme || "umum", 30),
    hint: clip(hint || "Kategori kreasi komunitas Palung.io!", 200),
    educationalNote: clip(educationalNote || "Dibuat oleh pemain di Workshop Palung.io.", 300),
    source: "workshop",
    createdBy: clip(createdBy || "Komunitas", 40),
    createdAt: now,
    answers: cleanAnswers
  };

  hits.push(now);
  customRate.set(ip, hits);
  runtimeData.customCategories.push(newCat);
  saveRuntimeData();

  io.emit("categories:updated", {
    category: {
      id: newCat.id,
      title: newCat.title,
      theme: newCat.theme,
      hint: newCat.hint,
      answerCount: newCat.answers.length,
      source: "workshop",
      createdBy: newCat.createdBy,
      createdAt: newCat.createdAt
    }
  });

  res.json({ success: true, category: newCat });
});

// ============================================================================
// SOCKET.IO REAL-TIME MULTIPLAYER HANDLERS
// ============================================================================
io.on("connection", (socket) => {
  let currentRoomCode = null;

  // Penjaga global: tangkap galat handler (payload rusak tidak boleh menjatuhkan server)
  // dan batasi laju event per koneksi (token bucket: 12 event/detik, burst 25).
  const bucket = { tokens: 25, last: Date.now() };
  const rawOn = socket.on.bind(socket);
  socket.on = (event, handler) =>
    rawOn(event, (...args) => {
      if (event !== "disconnect") {
        const now = Date.now();
        bucket.tokens = Math.min(25, bucket.tokens + ((now - bucket.last) / 1000) * 12);
        bucket.last = now;
        if (bucket.tokens < 1) {
          const cb = args[args.length - 1];
          if (typeof cb === "function") cb({ success: false, valid: false, error: "Terlalu cepat, coba lagi sebentar.", message: "Terlalu cepat, coba lagi sebentar." });
          return;
        }
        bucket.tokens -= 1;
      }
      try {
        const out = handler(...args);
        if (out && typeof out.catch === "function") {
          out.catch((err) => console.error("[socket]", event, err && err.message));
        }
      } catch (err) {
        console.error("[socket]", event, err && err.message);
      }
    });

  function leaveCurrentRoom(isDisconnect = false) {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      const humanPlayers = room.players.filter((p) => !p.isBot);
      if (isDisconnect && room.state !== "LOBBY") {
        const player = room.players.find((p) => p.id === socket.id);
        if (player) {
          player.disconnected = true;
          player.disconnectedAt = Date.now();
          broadcastRoomUpdate(room);
        }
        currentRoomCode = null;
        return;
      }

      if (!isDisconnect && room.state !== "LOBBY" && humanPlayers.length > 1) {
        socket.emit("room:leave:blocked", {
          message: "Tidak bisa keluar saat permainan multiplayer sedang berlangsung!"
        });
        return;
      }

      room.players = room.players.filter((p) => p.id !== socket.id);
      socket.leave(currentRoomCode);

      const remainingHumans = room.players.filter((p) => !p.isBot);
      if (remainingHumans.length === 0) {
        clearRoomTimers(room);
        rooms.delete(currentRoomCode);
      } else {
        if (room.hostId === socket.id) {
          room.hostId = remainingHumans[0].id;
        }
        broadcastRoomUpdate(room);
        checkIfAllPlayersReady(room);
      }
      broadcastPublicRooms();
    }
    currentRoomCode = null;
  }

  // 1. Buat Room Baru
  socket.on("room:create", ({ name, avatar, isPublic, settings, clientId }, callback) => {
    leaveCurrentRoom();
    const room = createRoom({
      hostSocketId: socket.id,
      hostName: name,
      hostAvatar: avatar,
      isPublic: isPublic !== false,
      isDaily: false,
      settings: settings || {}
    });
    if (room.players[0] && clientId) room.players[0].clientId = clientId;
    currentRoomCode = room.code;
    socket.join(room.code);
    broadcastRoomUpdate(room);
    if (typeof callback === "function") {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 2. Gabung Room dengan Kode 4 Huruf
  socket.on("room:join", ({ code, name, avatar, clientId }, callback) => {
    const cleanCode = (code || "").toString().trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Kode Room tidak ditemukan! Pastikan 4 huruf kode benar." });
      }
      return;
    }
    if (room.state !== "LOBBY") {
      if (typeof callback === "function") {
        callback({ success: false, error: "Permainan di room ini sedang berlangsung!" });
      }
      return;
    }
    const maxP = room.settings.maxPlayers || 8;
    if (room.players.length >= maxP) {
      if (typeof callback === "function") {
        callback({ success: false, error: `Room sudah penuh (${maxP}/${maxP})!` });
      }
      return;
    }

    leaveCurrentRoom();
    addPlayerToRoom(room, {
      id: socket.id,
      name: name || "Penyelam",
      avatar: avatar || "🤿",
      isBot: false
    });
    const joinedPlayer = room.players.find((p) => p.id === socket.id);
    if (joinedPlayer && clientId) joinedPlayer.clientId = clientId;
    currentRoomCode = room.code;
    socket.join(room.code);
    broadcastRoomUpdate(room);

    if (typeof callback === "function") {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 3. Quick Match (Langsung Masuk Arena Multiplayer + Bot Pintar)
  socket.on("room:quickmatch", ({ name, avatar, theme, clientId }, callback) => {
    leaveCurrentRoom();

    // Cari room publik yang masih di LOBBY, jika tidak ada buat room baru dengan 3 AI Bot
    let targetRoom = null;
    for (const r of rooms.values()) {
      if (r.isPublic && !r.isDaily && r.state === "LOBBY" && r.players.length < (r.settings.maxPlayers || 8)) {
        targetRoom = r;
        break;
      }
    }

    if (!targetRoom) {
      targetRoom = createRoom({
        hostSocketId: socket.id,
        hostName: name,
        hostAvatar: avatar,
        isPublic: true,
        isDaily: false,
        settings: {
          roundsTotal: 7,
          roundDuration: 25,
          theme: theme || "all",
          collisionRule: true,
          gameMode: "competitive"
        }
      });
      if (targetRoom.players[0] && clientId) targetRoom.players[0].clientId = clientId;
      // Tambahkan 3 AI Bot Penyelam dengan kepribadian berbeda agar langsung seru!
      BOT_PROFILES.slice(0, 3).forEach((bp) => {
        addPlayerToRoom(targetRoom, {
          id: `${bp.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: bp.name,
          avatar: bp.avatar,
          isBot: true,
          botProfile: bp
        });
      });
    } else {
      addPlayerToRoom(targetRoom, {
        id: socket.id,
        name: name || "Penyelam",
        avatar: avatar || "🤿",
        isBot: false
      });
      const joinedQuick = targetRoom.players.find((p) => p.id === socket.id);
      if (joinedQuick && clientId) joinedQuick.clientId = clientId;
    }

    currentRoomCode = targetRoom.code;
    socket.join(targetRoom.code);
    broadcastRoomUpdate(targetRoom);

    if (typeof callback === "function") {
      callback({ success: true, room: serializeRoom(targetRoom) });
    }
  });

  // 4. Mode Tantangan Harian (Daily Dive 7 Ronde Tersinkronisasi)
  socket.on("room:daily", ({ name, avatar, withBots }, callback) => {
    leaveCurrentRoom();
    const room = createRoom({
      hostSocketId: socket.id,
      hostName: name,
      hostAvatar: avatar,
      isPublic: false,
      isDaily: true
    });

    if (withBots) {
      BOT_PROFILES.slice(0, 2).forEach((bp) => {
        addPlayerToRoom(room, {
          id: `${bp.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          name: bp.name,
          avatar: bp.avatar,
          isBot: true,
          botProfile: bp
        });
      });
    }

    currentRoomCode = room.code;
    socket.join(room.code);
    startGame(room);

    if (typeof callback === "function") {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 5. Pengaturan Room & Tambah/Hapus AI Bot di Lobby
  socket.on("room:settings", (newSettings) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.hostId !== socket.id || room.state !== "LOBBY") return;

    if (!newSettings || typeof newSettings !== "object") return;
    const rounds = Math.round(Number(newSettings.roundsTotal));
    if (Number.isFinite(rounds)) room.settings.roundsTotal = Math.min(15, Math.max(3, rounds));
    const dur = Math.round(Number(newSettings.roundDuration));
    if (Number.isFinite(dur)) room.settings.roundDuration = Math.min(60, Math.max(10, dur));
    const maxP = Math.round(Number(newSettings.maxPlayers));
    if (Number.isFinite(maxP)) {
      const humanCount = room.players.filter((p) => !p.isBot).length;
      const minAllowed = Math.max(2, humanCount);
      room.settings.maxPlayers = Math.min(20, Math.max(minAllowed, maxP));
      while (room.players.length > room.settings.maxPlayers) {
        const lastBotIdx = room.players.map((p) => p.isBot).lastIndexOf(true);
        if (lastBotIdx === -1) break;
        room.players.splice(lastBotIdx, 1);
      }
    }
    if (Array.isArray(newSettings.themes) || typeof newSettings.theme === "string") {
      const normalized = normalizeRoomThemes(newSettings.themes || newSettings.theme);
      room.settings.theme = normalized.theme;
      room.settings.themes = normalized.themes;
    }
    if (Array.isArray(newSettings.pinnedCategoryIds)) {
      room.settings.pinnedCategoryIds = sanitizePinnedCategoryIds(newSettings.pinnedCategoryIds);
    }
    if (typeof newSettings.collisionRule === "boolean") {
      room.settings.collisionRule = newSettings.collisionRule;
    }
    if (["competitive", "coop", "tide", "puffer"].includes(newSettings.gameMode)) {
      room.settings.gameMode = newSettings.gameMode;
    }

    broadcastRoomUpdate(room);
  });

  socket.on("room:addBot", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "LOBBY" || room.players.length >= (room.settings.maxPlayers || 8)) return;

    const existingBotNames = new Set(room.players.filter((p) => p.isBot).map((p) => p.name));
    const availableProfile =
      BOT_PROFILES.find((bp) => !existingBotNames.has(bp.name)) ||
      BOT_PROFILES[room.players.length % BOT_PROFILES.length];

    addPlayerToRoom(room, {
      id: `${availableProfile.id}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: availableProfile.name,
      avatar: availableProfile.avatar,
      isBot: true,
      botProfile: availableProfile
    });

    broadcastRoomUpdate(room);
  });

  socket.on("room:removeBot", ({ botId }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "LOBBY") return;

    room.players = room.players.filter((p) => !(p.isBot && p.id === botId));
    broadcastRoomUpdate(room);
  });

  // 6. Mulai Permainan (Hanya Host!) & Tombol Siap/Ready + Chat Ephemeral di Lobby
  socket.on("lobby:toggleReady", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "LOBBY") return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;
    player.lobbyReady = !player.lobbyReady;
    broadcastRoomUpdate(room);
  });

  socket.on("lobby:chat", ({ text }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "LOBBY") return;
    const player = room.players.find((p) => p.id === socket.id);
    const cleanText = String(text || "").trim().slice(0, 160);
    if (!player || !cleanText) return;
    // Hanya diteruskan secara real-time di memori (tidak disimpan ke database!)
    io.to(room.code).emit("lobby:chat", {
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      text: cleanText,
      ts: Date.now()
    });
  });

  socket.on("game:start", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (room.hostId !== socket.id) return; // Hanya Host yang bisa memulai!
    if (room.state !== "LOBBY" && room.state !== "GAMEOVER") return;
    clearLobbyIdleTimer(room);
    startGame(room);
  });

  socket.on("game:backToLobby", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    clearRoomTimers(room);
    room.state = "LOBBY";
    room.players.forEach((p) => {
      if (!p.isBot) p.lobbyReady = p.id === room.hostId;
    });
    scheduleLobbyAutoDisband(room);
    broadcastRoomUpdate(room);
  });

  // 7. Submit Jawaban Selama Ronde Berlangsung (Hybrid: Database Lokal + Groq Multi-Model AI Judge)
  socket.on("round:submit", async ({ answer }, callback) => {
    const replyErr = (msg, extra = {}) => {
      if (typeof callback === "function") {
        callback({ valid: false, message: msg, ...extra });
      }
    };
    if (!currentRoomCode) return replyErr("Room tidak ditemukan.");
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "PLAYING") return replyErr("Ronde belum aktif atau sudah berakhir.");

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return replyErr("Pemain tidak ditemukan di room.");
    if (player.isCheckingAi) {
      return replyErr("Jawaban sedang diperiksa Sonar AI...", { checking: true });
    }

    const currentCat = room.selectedCategories[room.currentRound - 1];
    if (!currentCat) return replyErr("Kategori ronde tidak ditemukan.");
    const submittedRound = room.currentRound;

    let match = matchCategoryAnswer(currentCat, answer);
    let aiModelUsed = null;
    let aiError = false;

    if (!match && ai.isEnabled() && (answer || "").trim().length >= 2) {
      player.isCheckingAi = true;
      const remainingMs = Math.max(0, (room.roundDeadline || 0) - Date.now());
      const aiTimeoutMs = Math.max(2500, Math.min(6000, remainingMs + 2500));
      try {
        const aiVerdict = await ai.validateAnswerWithAI(
          currentCat.title,
          currentCat.hint,
          (answer || "").trim(),
          { timeoutMs: aiTimeoutMs }
        );
        if (room.state !== "PLAYING" || room.currentRound !== submittedRound) {
          return replyErr("Waktu ronde keburu habis.");
        }
        if (aiVerdict && aiVerdict.valid) {
          if (!runtimeData.aiLearnedAnswers) runtimeData.aiLearnedAnswers = {};
          if (!runtimeData.aiLearnedAnswers[currentCat.id]) {
            runtimeData.aiLearnedAnswers[currentCat.id] = [];
          }
          const newEntry = {
            name: aiVerdict.canonicalName,
            aliases: [normalizeText(answer)],
            score: aiVerdict.score,
            fact: aiVerdict.fact
          };
          runtimeData.aiLearnedAnswers[currentCat.id].push(newEntry);
          saveRuntimeData();
          match = computeDynamicScore(currentCat.id, newEntry);
          aiModelUsed = aiVerdict.modelUsed;
        }
      } catch (err) {
        aiError = true;
        console.warn("[AI] Gagal memvalidasi jawaban:", err.message);
      } finally {
        if (room.currentRound === submittedRound) {
          player.isCheckingAi = false;
        }
      }
    }

    if (room.state !== "PLAYING" || room.currentRound !== submittedRound) {
      return replyErr("Waktu ronde keburu habis.");
    }

    if (!match) {
      return replyErr(
        aiError
          ? "Sonar AI sedang sibuk/gangguan, coba kirim ulang atau gunakan jawaban lain!"
          : `Sonar tidak mendeteksi "${(answer || "").trim()}" di kategori ini. Coba istilah lain!`,
        { aiError }
      );
    }

    room.roundSubmissions[socket.id] = {
      rawInput: (answer || "").trim(),
      match,
      aiModelUsed,
      submittedAt: Date.now()
    };
    player.readyInRound = true;

    if (typeof callback === "function") {
      callback({
        valid: true,
        canonicalName: match.canonicalName,
        tierHint: match.tier.name,
        aiValidated: Boolean(aiModelUsed),
        aiModelUsed,
        rerollsLeft: player.rerollsLeft
      });
    }

    broadcastRoomUpdate(room);
    checkIfAllPlayersReady(room);
  });

  // 8. Fitur "Sonar Cadangan" (Buka Kunci Jawaban untuk Ganti Jawaban yang Lebih Langka, 1x per Game!)
  socket.on("round:reroll", (callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "PLAYING") return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player || player.rerollsLeft <= 0) {
      if (typeof callback === "function") {
        callback({ success: false, message: "Sonar Cadangan sudah habis digunakan!" });
      }
      return;
    }

    player.rerollsLeft -= 1;
    player.readyInRound = false;
    delete room.roundSubmissions[socket.id];
    broadcastRoomUpdate(room);

    if (typeof callback === "function") {
      callback({ success: true, rerollsLeft: player.rerollsLeft });
    }
  });

  // 8b. Sonar Ping: bocoran huruf awal salah satu jawaban langka (mengorbankan oksigen)
  socket.on("round:sonar", (callback) => {
    const reply = typeof callback === "function" ? callback : () => {};
    if (!currentRoomCode) return reply({ success: false, message: "Tidak ada ruangan." });
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "PLAYING") return reply({ success: false, message: "Sonar hanya aktif saat ronde berjalan." });
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return reply({ success: false, message: "Pemain tidak ditemukan." });
    if (room.settings.gameMode === "tide") return reply({ success: false, message: "Sonar Ping tidak aktif di mode Arus Pasang." });
    if (player.readyInRound) return reply({ success: false, message: "Jawabanmu sudah terkunci." });
    if (player.sonarUsedRound === room.currentRound) return reply({ success: false, message: "Sonar Ping hanya 1x per ronde." });
    if (player.sonarPings <= 0) return reply({ success: false, message: "Sonar Ping sudah habis." });
    if (player.oxygen < SONAR_PING_COST) return reply({ success: false, message: "Oksigen tidak cukup untuk Sonar Ping." });

    const cat = room.selectedCategories[room.currentRound - 1];
    if (!cat) return reply({ success: false, message: "Kategori tidak ditemukan." });
    const rare = cat.answers.filter((a) => a.score >= 65);
    const pool = rare.length ? rare : [...cat.answers].sort((a, b) => b.score - a.score).slice(0, 3);
    const target = pool[Math.floor(Math.random() * pool.length)];
    const name = String(target.name).trim();

    player.sonarPings -= 1;
    player.sonarUsedRound = room.currentRound;
    player.oxygen = Math.max(0, player.oxygen - SONAR_PING_COST);
    broadcastRoomUpdate(room);

    reply({
      success: true,
      firstLetter: name.charAt(0).toUpperCase(),
      letters: name.replace(/[^\p{L}\p{N}]/gu, "").length,
      words: name.split(/\s+/).length,
      tierName: getTierInfo(target.score).name,
      sonarPings: player.sonarPings,
      oxygen: player.oxygen
    });
  });

  // 9. Kirim Reaksi Gelembung Emoji atau Pesan Taktis di Arena
  socket.on("room:reaction", ({ emoji, text }) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const nowR = Date.now();
    if (player.lastReactionAt && nowR - player.lastReactionAt < 400) return;
    player.lastReactionAt = nowR;
    if (emoji != null && typeof emoji !== "string") return;
    if (text != null && typeof text !== "string") return;

    io.to(room.code).emit("room:reaction", {
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      emoji: emoji ? emoji.slice(0, 8) : null,
      text: text ? text.slice(0, 80) : null
    });
  });

  socket.on("session:reconnect", ({ clientId }, callback) => {
    if (!clientId) {
      if (typeof callback === "function") callback({ success: false });
      return;
    }
    let foundRoom = null;
    let foundPlayer = null;
    for (const r of rooms.values()) {
      if (r.state === "LOBBY") continue;
      const p = r.players.find((pl) => !pl.isBot && pl.clientId === clientId);
      if (p) {
        foundRoom = r;
        foundPlayer = p;
        break;
      }
    }
    if (!foundRoom || !foundPlayer) {
      if (typeof callback === "function") callback({ success: false });
      return;
    }

    const oldId = foundPlayer.id;
    foundPlayer.id = socket.id;
    foundPlayer.disconnected = false;
    if (foundRoom.hostId === oldId) {
      foundRoom.hostId = socket.id;
    }
    if (foundRoom.roundSubmissions && foundRoom.roundSubmissions[oldId]) {
      foundRoom.roundSubmissions[socket.id] = foundRoom.roundSubmissions[oldId];
      delete foundRoom.roundSubmissions[oldId];
    }

    currentRoomCode = foundRoom.code;
    socket.join(foundRoom.code);
    broadcastRoomUpdate(foundRoom);

    const currentCat = foundRoom.selectedCategories[foundRoom.currentRound - 1];
    const roundData =
      foundRoom.state === "PLAYING" && currentCat
        ? {
            round: foundRoom.currentRound,
            roundsTotal: foundRoom.settings.totalRounds,
            deadline: foundRoom.roundDeadline,
            serverNow: Date.now(),
            category: {
              id: currentCat.id,
              title: currentCat.title,
              hint: currentCat.hint,
              theme: currentCat.theme
            },
            durationSeconds: Math.max(
              3,
              Math.ceil(((foundRoom.roundDeadline || Date.now()) - Date.now()) / 1000)
            ),
            room: serializeRoom(foundRoom),
            alreadySubmitted: Boolean(foundRoom.roundSubmissions[socket.id])
          }
        : null;
    const lastReveal =
      foundRoom.state === "REVEAL" && foundRoom.roundHistory && foundRoom.roundHistory.length
        ? foundRoom.roundHistory[foundRoom.roundHistory.length - 1]
        : null;

    if (typeof callback === "function") {
      callback({
        success: true,
        room: serializeRoom(foundRoom),
        roundData,
        lastReveal
      });
    }
  });

  socket.on("room:leave", () => {
    leaveCurrentRoom(false);
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom(true);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌊 Server PALUNG.IO berjalan di http://localhost:${PORT}`);
  // Jika bank soal AI masih sedikit, otomatis generate bertahap di background
  setTimeout(async () => {
    const needed = Math.max(0, 12 - (runtimeData.customCategories || []).length);
    const batch = Math.min(5, needed);
    for (let i = 0; i < batch; i++) {
      await expandQuestionBankWithAI("all");
    }
  }, 4000);
});
