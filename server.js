const express = require("express");
const http = require("http");
const path = require("path");
const fs = require("fs");
const os = require("os");
const QRCode = require("qrcode");
const { Server } = require("socket.io");
const { CATEGORIES } = require("./data/categories");

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

// Penyimpanan Statistik Kelangkaan Dinamis & Leaderboard Harian (SQLite / JSON fallback)
const storage = require("./storage");
let runtimeData = storage.load();
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

function matchCategoryAnswer(category, rawInput) {
  const normInput = normalizeText(rawInput);
  if (!normInput || normInput.length < 1) return null;
  const strippedInput = stripOptionalPrefix(normInput);

  // 1. Exact Match (Nama utama atau alias, baik utuh maupun tanpa prefix opsional)
  for (const ans of category.answers) {
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

  for (const ans of category.answers) {
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

function createRoom({
  hostSocketId,
  hostName,
  hostAvatar,
  isPublic = true,
  isDaily = false,
  settings = {}
}) {
  const code = generateRoomCode();
  const room = {
    code,
    hostId: hostSocketId,
    isPublic: Boolean(isPublic),
    isDaily: Boolean(isDaily),
    state: "LOBBY", // LOBBY | PLAYING | REVEAL | GAMEOVER
    settings: {
      roundsTotal: isDaily ? 7 : Number(settings.roundsTotal) || 7,
      roundDuration: isDaily ? 25 : Number(settings.roundDuration) || 25,
      theme: isDaily ? "all" : settings.theme || "all",
      collisionRule: isDaily ? false : settings.collisionRule !== false,
      gameMode: isDaily ? "daily" : settings.gameMode || "competitive" // competitive | coop | daily
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
  return room;
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
}

function selectCategoriesForRoom(room) {
  if (room.isDaily) {
    return getDailyCategories(getTodayKey());
  }
  const all = getAllCategories();
  let filtered = all;
  if (room.settings.theme && room.settings.theme !== "all") {
    filtered = all.filter((c) => c.theme === room.settings.theme);
  }
  if (filtered.length < room.settings.roundsTotal) {
    filtered = all;
  }
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, room.settings.roundsTotal);
}

function startGame(room) {
  clearRoomTimers(room);
  room.state = "PLAYING";
  room.currentRound = 0;
  room.roundHistory = [];
  room.selectedCategories = selectCategoriesForRoom(room);
  room.settings.roundsTotal = room.selectedCategories.length;

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
  room.roundSubmissions = {};
  room.players.forEach((p) => {
    p.readyInRound = false;
    p.roundDepth = 0;
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

  // Timer cek batas waktu
  room.timerInterval = setInterval(() => {
    if (Date.now() >= room.roundDeadline) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
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
    answerCount: c.answers.length
  }));
  res.json({ categories: list });
});

const customRate = new Map(); // ip -> [timestamps]
function clip(v, n) { return String(v == null ? "" : v).replace(/[<>]/g, "").trim().slice(0, n); }

app.post("/api/categories/custom", (req, res) => {
  const ip = req.ip || "x";
  const now = Date.now();
  const hits = (customRate.get(ip) || []).filter((t) => now - t < 3600000);
  if (hits.length >= 5) {
    return res.status(429).json({ error: "Terlalu banyak kategori dibuat. Coba lagi dalam satu jam." });
  }
  const { title, theme, hint, educationalNote, answers } = req.body || {};
  if (!title || !Array.isArray(answers) || answers.length < 4) {
    return res.status(400).json({
      error: "Masukkan judul kategori dan minimal 4 jawaban beserta skor kelangkaannya."
    });
  }
  if ((runtimeData.customCategories || []).length >= 500) {
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
    answers: cleanAnswers
  };

  hits.push(now);
  customRate.set(ip, hits);
  runtimeData.customCategories.push(newCat);
  saveRuntimeData();

  res.json({ success: true, category: newCat });
});

// ============================================================================
// SOCKET.IO REAL-TIME MULTIPLAYER HANDLERS
// ============================================================================
io.on("connection", (socket) => {
  let currentRoomCode = null;

  function leaveCurrentRoom() {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (room) {
      room.players = room.players.filter((p) => p.id !== socket.id);
      socket.leave(currentRoomCode);

      const humanPlayers = room.players.filter((p) => !p.isBot);
      if (humanPlayers.length === 0) {
        clearRoomTimers(room);
        rooms.delete(currentRoomCode);
      } else {
        if (room.hostId === socket.id) {
          room.hostId = humanPlayers[0].id;
        }
        broadcastRoomUpdate(room);
        checkIfAllPlayersReady(room);
      }
    }
    currentRoomCode = null;
  }

  // 1. Buat Room Baru
  socket.on("room:create", ({ name, avatar, isPublic, settings }, callback) => {
    leaveCurrentRoom();
    const room = createRoom({
      hostSocketId: socket.id,
      hostName: name,
      hostAvatar: avatar,
      isPublic: isPublic !== false,
      isDaily: false,
      settings: settings || {}
    });
    currentRoomCode = room.code;
    socket.join(room.code);
    broadcastRoomUpdate(room);
    if (typeof callback === "function") {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 2. Gabung Room dengan Kode 4 Huruf
  socket.on("room:join", ({ code, name, avatar }, callback) => {
    const cleanCode = (code || "").toString().trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) {
      if (typeof callback === "function") {
        callback({ success: false, error: "Kode Room tidak ditemukan! Pastikan 4 huruf kode benar." });
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
    currentRoomCode = room.code;
    socket.join(room.code);
    broadcastRoomUpdate(room);

    if (typeof callback === "function") {
      callback({ success: true, room: serializeRoom(room) });
    }
  });

  // 3. Quick Match (Langsung Masuk Arena Multiplayer + Bot Pintar)
  socket.on("room:quickmatch", ({ name, avatar, theme }, callback) => {
    leaveCurrentRoom();

    // Cari room publik yang masih di LOBBY, jika tidak ada buat room baru dengan 3 AI Bot
    let targetRoom = null;
    for (const r of rooms.values()) {
      if (r.isPublic && !r.isDaily && r.state === "LOBBY" && r.players.length < 8) {
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

    if (newSettings.roundsTotal) room.settings.roundsTotal = Number(newSettings.roundsTotal);
    if (newSettings.roundDuration) room.settings.roundDuration = Number(newSettings.roundDuration);
    if (newSettings.theme) room.settings.theme = newSettings.theme;
    if (typeof newSettings.collisionRule === "boolean") {
      room.settings.collisionRule = newSettings.collisionRule;
    }
    if (newSettings.gameMode) room.settings.gameMode = newSettings.gameMode;

    broadcastRoomUpdate(room);
  });

  socket.on("room:addBot", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "LOBBY" || room.players.length >= 8) return;

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

  // 6. Mulai Permainan / Main Lagi
  socket.on("game:start", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    if (room.state !== "LOBBY" && room.state !== "GAMEOVER") return;
    startGame(room);
  });

  socket.on("game:backToLobby", () => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room) return;
    clearRoomTimers(room);
    room.state = "LOBBY";
    broadcastRoomUpdate(room);
  });

  // 7. Submit Jawaban Selama Ronde Berlangsung
  socket.on("round:submit", ({ answer }, callback) => {
    if (!currentRoomCode) return;
    const room = rooms.get(currentRoomCode);
    if (!room || room.state !== "PLAYING") return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    const currentCat = room.selectedCategories[room.currentRound - 1];
    if (!currentCat) return;

    const match = matchCategoryAnswer(currentCat, answer);
    if (!match) {
      if (typeof callback === "function") {
        callback({
          valid: false,
          message: `Sonar tidak mendeteksi "${(answer || "").trim()}" di kategori ini. Coba istilah lain!`
        });
      }
      return;
    }

    room.roundSubmissions[socket.id] = {
      rawInput: (answer || "").trim(),
      match,
      submittedAt: Date.now()
    };
    player.readyInRound = true;

    if (typeof callback === "function") {
      callback({
        valid: true,
        canonicalName: match.canonicalName,
        tierHint: match.tier.name,
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

    io.to(room.code).emit("room:reaction", {
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      emoji: emoji ? emoji.slice(0, 8) : null,
      text: text ? text.slice(0, 80) : null
    });
  });

  socket.on("room:leave", () => {
    leaveCurrentRoom();
  });

  socket.on("disconnect", () => {
    leaveCurrentRoom();
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌊 Server PALUNG.IO berjalan di http://localhost:${PORT}`);
});
