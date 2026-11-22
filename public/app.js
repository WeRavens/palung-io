// ============================================================================
// PALUNG.IO — Hybrid Mobile & Web Client Engine
// Mendukung: Real-Time Socket.IO Multiplayer + 100% On-Device Offline Engine
// (Siap untuk Google Play Store Capacitor APK & Installable PWA)
// ============================================================================

const isCapacitorNative =
  window.location.protocol === "capacitor:" ||
  (window.location.hostname === "localhost" && window.location.port !== "3000");

const apiBaseUrl = isCapacitorNative
  ? localStorage.getItem("palung_server_url") || window.PALUNG_DEFAULT_SERVER || "http://192.168.1.9:3000"
  : "";

const socket =
  typeof io !== "undefined"
    ? io(apiBaseUrl || undefined, { reconnectionAttempts: 4, timeout: 3500 })
    : null;

// State Aplikasi
let myPlayerName = localStorage.getItem("palung_name") || "Kapten Samudra";
let myPlayerAvatar = localStorage.getItem("palung_avatar") || "🤿";
let soundEnabled = true;
let currentRoom = null;
let isLocalOfflineGame = false;
let lanBaseUrl = window.location.origin;
let deferredPwaPrompt = null;
let roundTimerInterval = null;
let revealCountdownInterval = null;
let localBotTimeouts = [];
let lastTickSecond = -1;

// Elemen DOM Utama
const screens = {
  home: document.getElementById("screen-home"),
  lobby: document.getElementById("screen-lobby"),
  game: document.getElementById("screen-game"),
  gameover: document.getElementById("screen-gameover")
};

const inputPlayerName = document.getElementById("input-player-name");
const ambientZoneText = document.getElementById("ambient-zone-text");

// ============================================================================
// REGISTRASI SERVICE WORKER (PWA) & INSTALL BANNER
// ============================================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPwaPrompt = e;
  const banner = document.getElementById("pwa-install-banner");
  if (banner) banner.classList.remove("hidden");
});

document.getElementById("btn-install-pwa-now").addEventListener("click", async () => {
  if (!deferredPwaPrompt) {
    document.getElementById("modal-mobile-hub").classList.remove("hidden");
    return;
  }
  deferredPwaPrompt.prompt();
  await deferredPwaPrompt.userChoice;
  deferredPwaPrompt = null;
  document.getElementById("pwa-install-banner").classList.add("hidden");
});

document.getElementById("btn-dismiss-pwa").addEventListener("click", () => {
  document.getElementById("pwa-install-banner").classList.add("hidden");
});

// ============================================================================
// EFEK GETAR HAPTIC (MOBILE VIBRATION API)
// ============================================================================
function triggerHaptic(pattern = 35) {
  if (!soundEnabled) return;
  if (navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }
}

// ============================================================================
// IDENTITAS PENYELAM & NAVIGASI LAYAR
// ============================================================================
inputPlayerName.value = myPlayerName;
document.querySelectorAll(".avatar-btn").forEach((btn) => {
  if (btn.dataset.avatar === myPlayerAvatar) {
    btn.classList.add("selected");
  } else {
    btn.classList.remove("selected");
  }
  btn.addEventListener("click", () => {
    document.querySelectorAll(".avatar-btn").forEach((b) => b.classList.remove("selected"));
    btn.classList.add("selected");
    myPlayerAvatar = btn.dataset.avatar;
    localStorage.setItem("palung_avatar", myPlayerAvatar);
    playSonarPing(660, 0.08);
    triggerHaptic(25);
  });
});

inputPlayerName.addEventListener("input", () => {
  myPlayerName = inputPlayerName.value.trim() || "Kapten Samudra";
  localStorage.setItem("palung_name", myPlayerName);
});

function getIdentity() {
  myPlayerName = inputPlayerName.value.trim() || "Kapten Samudra";
  localStorage.setItem("palung_name", myPlayerName);
  return { name: myPlayerName, avatar: myPlayerAvatar };
}

function showScreen(screenName) {
  Object.values(screens).forEach((el) => el.classList.remove("active"));
  if (screens[screenName]) {
    screens[screenName].classList.add("active");
  }
  if (screenName !== "game" && typeof setBgmMood === "function") {
    setBgmMood("calm");
  }
  // Sinkronkan Bottom Navigation Bar
  document.querySelectorAll(".mnav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.action === screenName);
  });
}

function showToast(msg) {
  const container = document.getElementById("toast-container");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3500);
}

// ============================================================================
// WEB AUDIO API SYNTHESIZER & PROCEDURAL DEEP-OCEAN BACKSOUND (BGM + SFX)
// ============================================================================
let audioCtx = null;
let bgmRunning = false;
let bgmMasterGain = null;
let bgmDelayNode = null;
let bgmSequencerTimer = null;
let bgmStep = 0;
let bgmMood = "calm"; // "calm" (Menu/Lobby) | "diving" (Ronde Aktif) | "urgent" (<= 7 detik)

// Progresi Akor Samudra (Cm9 -> Abmaj7 -> Fm9 -> G7sus4)
const OCEAN_CHORDS = [
  { root: 65.41, pad: [130.81, 196.0, 233.08, 293.66], arp: [261.63, 311.13, 392.0, 466.16, 587.33, 622.25] },
  { root: 51.91, pad: [103.83, 155.56, 196.0, 261.63], arp: [261.63, 311.13, 392.0, 523.25, 622.25, 783.99] },
  { root: 43.65, pad: [87.31, 130.81, 174.61, 207.65], arp: [261.63, 349.23, 415.3, 523.25, 587.33, 698.46] },
  { root: 49.0, pad: [98.0, 146.83, 174.61, 261.63], arp: [293.66, 349.23, 392.0, 523.25, 587.33, 783.99] }
];

function getAudioCtx() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function setupBgmBus() {
  const ctx = getAudioCtx();
  if (!ctx || bgmMasterGain) return;

  bgmMasterGain = ctx.createGain();
  bgmMasterGain.gain.setValueAtTime(soundEnabled ? 0.55 : 0.0001, ctx.currentTime);
  bgmMasterGain.connect(ctx.destination);

  // Echo Bawah Laut (Underwater Delay Loop)
  bgmDelayNode = ctx.createDelay(1.0);
  bgmDelayNode.delayTime.setValueAtTime(0.34, ctx.currentTime);

  const feedbackGain = ctx.createGain();
  feedbackGain.gain.setValueAtTime(0.32, ctx.currentTime);

  const delayFilter = ctx.createBiquadFilter();
  delayFilter.type = "lowpass";
  delayFilter.frequency.setValueAtTime(1600, ctx.currentTime);

  bgmDelayNode.connect(delayFilter);
  delayFilter.connect(feedbackGain);
  feedbackGain.connect(bgmDelayNode);
  delayFilter.connect(bgmMasterGain);
}

// Suara Gelembung Air Halus (Underwater Bubble Pop)
function playBubblePop(volume = 0.045) {
  if (!soundEnabled || document.hidden) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  setupBgmBus();

  const startFreq = 240 + Math.random() * 180;
  const endFreq = startFreq * (2.1 + Math.random() * 0.6);
  const dur = 0.065 + Math.random() * 0.045;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + dur);

  osc.connect(gain);
  gain.connect(bgmDelayNode);
  gain.connect(bgmMasterGain);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.01);
}

// Nada Pad Samudra Dalam yang Mengalun Lembut
function playOceanChordPad(freqs, duration = 3.6) {
  if (!soundEnabled || document.hidden) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  setupBgmBus();

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(320, ctx.currentTime);
  filter.frequency.linearRampToValueAtTime(720, ctx.currentTime + duration * 0.5);
  filter.frequency.linearRampToValueAtTime(340, ctx.currentTime + duration);
  filter.connect(bgmMasterGain);

  freqs.forEach((f, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = idx % 2 === 0 ? "sine" : "triangle";
    // Sedikit detune agar terdengar hangat & organik seperti arus laut
    osc.frequency.setValueAtTime(f * (1 + (idx - 1.5) * 0.0018), ctx.currentTime);

    gain.gain.setValueAtTime(0.0005, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.032, ctx.currentTime + duration * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(filter);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  });
}

// Petikan Marimba / Kalimba Bioluminesensi
function playMarimbaPluck(freq, volume = 0.065, duration = 0.45) {
  if (!soundEnabled || document.hidden) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  setupBgmBus();

  const osc = ctx.createOscillator();
  const subOsc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);

  subOsc.type = "sine";
  subOsc.frequency.setValueAtTime(freq * 2, ctx.currentTime);

  const subGain = ctx.createGain();
  subGain.gain.setValueAtTime(0.22, ctx.currentTime);
  subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2200, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(480, ctx.currentTime + duration);

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);

  osc.connect(filter);
  subOsc.connect(subGain);
  subGain.connect(filter);
  filter.connect(gain);

  gain.connect(bgmMasterGain);
  gain.connect(bgmDelayNode);

  osc.start();
  subOsc.start();
  osc.stop(ctx.currentTime + duration + 0.02);
  subOsc.stop(ctx.currentTime + duration + 0.02);
}

// Denyut Sub-Bass Kapal Selam saat Menyelam
function playSubBassPulse(freq, volume = 0.085) {
  if (!soundEnabled || document.hidden) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  setupBgmBus();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.82, ctx.currentTime + 0.28);

  gain.gain.setValueAtTime(0.001, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);

  osc.connect(gain);
  gain.connect(bgmMasterGain);
  osc.start();
  osc.stop(ctx.currentTime + 0.34);
}

// Loop Sequencer Backsound Samudra Adaptif
function startOceanBacksound() {
  if (bgmRunning) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  setupBgmBus();
  bgmRunning = true;

  // Pola ritme petikan melodi (16 langkah per siklus akor)
  const melodyPattern = [0, -1, 2, -1, 4, 3, -1, 1, 5, -1, 3, -1, 2, -1, 4, -1];

  function tickBgmStep() {
    if (!bgmRunning) return;
    if (soundEnabled && !document.hidden) {
      const stepInBar = bgmStep % 16;
      const chordIdx = Math.floor(bgmStep / 16) % OCEAN_CHORDS.length;
      const chord = OCEAN_CHORDS[chordIdx];

      // 1. Pad Akor Samudra setiap awal bar (langkah 0)
      if (stepInBar === 0) {
        playOceanChordPad(chord.pad, bgmMood === "urgent" ? 2.8 : 3.8);
      }

      // 2. Denyut Bass Kapal Selam (lebih aktif saat ronde berlangsung)
      if (bgmMood === "diving" && (stepInBar % 4 === 0)) {
        playSubBassPulse(chord.root, 0.08);
      } else if (bgmMood === "urgent" && (stepInBar % 2 === 0)) {
        playSubBassPulse(chord.root * (stepInBar % 4 === 0 ? 1 : 1.5), 0.095);
      } else if (bgmMood === "calm" && stepInBar === 0) {
        playSubBassPulse(chord.root, 0.06);
      }

      // 3. Melodi Marimba / Kalimba Bawah Laut
      const patNote = melodyPattern[stepInBar];
      const playChance = bgmMood === "calm" ? 0.72 : 0.92;
      if (patNote >= 0 && Math.random() < playChance) {
        const noteIdx = (patNote + (bgmStep % 3 === 0 ? 1 : 0)) % chord.arp.length;
        const freq = chord.arp[noteIdx];
        playMarimbaPluck(freq, bgmMood === "calm" ? 0.055 : 0.072, 0.42);
      }

      // 4. Tekstur Gelembung Air Acak
      if (stepInBar === 7 || (stepInBar === 14 && Math.random() < 0.65)) {
        playBubblePop(0.038);
      }
    }

    bgmStep++;
    const stepMs = bgmMood === "urgent" ? 185 : bgmMood === "diving" ? 220 : 260;
    bgmSequencerTimer = setTimeout(tickBgmStep, stepMs);
  }

  tickBgmStep();
}

function setBgmMood(newMood) {
  bgmMood = newMood;
  if (!bgmRunning && soundEnabled) {
    startOceanBacksound();
  }
}

// Aktifkan Backsound Otomatis pada Sentuhan / Klik Pertama di Layar
["pointerdown", "touchstart", "keydown"].forEach((evtName) => {
  window.addEventListener(
    evtName,
    () => {
      if (soundEnabled && !bgmRunning) {
        startOceanBacksound();
      } else if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    },
    { passive: true }
  );
});

// Otomatis Pause Backsound Saat Aplikasi Diminimize di HP, Lanjut Saat Dibuka
document.addEventListener("visibilitychange", () => {
  if (!audioCtx) return;
  if (document.hidden) {
    audioCtx.suspend().catch(() => {});
  } else if (soundEnabled) {
    audioCtx.resume().catch(() => {});
  }
});

function playSonarPing(freq = 880, duration = 0.22) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  setupBgmBus();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.14, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  if (bgmDelayNode) gain.connect(bgmDelayNode);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playDiveLock() {
  if (!soundEnabled) return;
  triggerHaptic([35, 50, 65]);
  playBubblePop(0.07);
  playSonarPing(587.33, 0.14);
  setTimeout(() => playSonarPing(880, 0.26), 90);
}

function playErrorBuzz() {
  if (!soundEnabled) return;
  triggerHaptic([120, 60, 120]);
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(190, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(130, ctx.currentTime + 0.22);
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.24);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.24);
}

function playRevealFanfare(tierId, isCollision) {
  if (!soundEnabled) return;
  if (isCollision) {
    triggerHaptic([180, 70, 180]);
    playErrorBuzz();
    setTimeout(() => playErrorBuzz(), 140);
    return;
  }
  if (tierId === "LEGENDA") {
    triggerHaptic([50, 40, 50, 40, 140]);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => playSonarPing(f, 0.28), idx * 95);
    });
  } else if (tierId === "ABISAL") {
    triggerHaptic([45, 50, 90]);
    [440, 554.37, 659.25].forEach((f, idx) => {
      setTimeout(() => playSonarPing(f, 0.24), idx * 100);
    });
  } else {
    triggerHaptic(40);
    playSonarPing(523.25, 0.2);
  }
}

document.getElementById("btn-sound-toggle").addEventListener("click", (e) => {
  soundEnabled = !soundEnabled;
  e.currentTarget.textContent = soundEnabled ? "🎵🔊" : "🔇";
  const ctx = getAudioCtx();
  if (bgmMasterGain && ctx) {
    bgmMasterGain.gain.setTargetAtTime(soundEnabled ? 0.55 : 0.0001, ctx.currentTime, 0.08);
  }
  if (soundEnabled) {
    if (!bgmRunning) startOceanBacksound();
    playSonarPing(740, 0.15);
    showToast("🎵 Backsound Samudra & Efek Sonar Aktif!");
  } else {
    showToast("🔇 Backsound & Suara Dimatikan");
  }
});

// ============================================================================
// SIMULATOR MODE LAYAR HP (DI DESKTOP) & BOTTOM NAV BAR
// ============================================================================
const phoneFrameWrapper = document.getElementById("phone-frame-wrapper");
const btnTogglePhone = document.getElementById("btn-toggle-phone-frame");

btnTogglePhone.addEventListener("click", () => {
  const active = phoneFrameWrapper.classList.toggle("simulated-phone");
  btnTogglePhone.textContent = active ? "🖥️ Layar Penuh" : "📱 Mode Layar HP";
  triggerHaptic(25);
  showToast(
    active
      ? "📱 Mode Pratinjau HP aktif! Begini tampilan PALUNG.IO di smartphone."
      : "🖥️ Kembali ke tampilan layar penuh."
  );
});

document.querySelectorAll(".mnav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action;
    triggerHaptic(25);
    if (action === "home") {
      document.getElementById("btn-home-logo").click();
    } else if (action === "quick") {
      document.getElementById("btn-quick-match").click();
    } else if (action === "daily") {
      document.getElementById("btn-daily-challenge").click();
    } else if (action === "mobilehub") {
      openMobileHubModal();
    } else if (action === "workshop") {
      document.getElementById("modal-workshop").classList.remove("hidden");
    }
  });
});

// ============================================================================
// MESIN GAME OFFLINE MANDIRI (ON-DEVICE ENGINE UNTUK APK PLAY STORE)
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
  if (!a.length) return b.length;
  if (!b.length) return a.length;
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
  if (score >= 89) return { id: "LEGENDA", name: "LEGENDA PALUNG", emoji: "🟡", color: "#facc15" };
  if (score >= 65) return { id: "ABISAL", name: "ZONA ABISAL", emoji: "🟣", color: "#c084fc" };
  if (score >= 35) return { id: "KARANG", name: "TERUMBU KARANG", emoji: "🔵", color: "#38bdf8" };
  return { id: "PLANKTON", name: "ZONA PLANKTON", emoji: "🟢", color: "#10b981" };
}

function getLocalCategories() {
  const custom = JSON.parse(localStorage.getItem("palung_custom_cats") || "[]");
  return [...(window.PALUNG_CATEGORIES || []), ...custom];
}

function matchLocalAnswer(category, rawInput) {
  const normInput = normalizeText(rawInput);
  if (!normInput) return null;
  const strippedInput = stripOptionalPrefix(normInput);

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
        return {
          canonicalName: ans.name,
          baseScore: ans.score,
          fact: ans.fact,
          tier: getTierInfo(ans.score)
        };
      }
    }
  }

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
    return {
      canonicalName: bestMatch.name,
      baseScore: bestMatch.score,
      fact: bestMatch.fact,
      tier: getTierInfo(bestMatch.score)
    };
  }
  return null;
}

function startLocalOfflineMatch({ isDaily = false } = {}) {
  clearClientTimers();
  isLocalOfflineGame = true;
  const { name, avatar } = getIdentity();
  const allCats = getLocalCategories();
  const selected = [...allCats].sort(() => Math.random() - 0.5).slice(0, 7);

  currentRoom = {
    code: isDaily ? "HARI" : "SOLO",
    hostId: "me",
    isPublic: false,
    isDaily,
    state: "PLAYING",
    settings: {
      roundsTotal: selected.length,
      roundDuration: 25,
      theme: "all",
      collisionRule: !isDaily,
      gameMode: isDaily ? "daily" : "competitive"
    },
    currentRound: 0,
    roundsTotal: selected.length,
    selectedCategories: selected,
    roundSubmissions: {},
    roundHistory: [],
    players: [
      {
        id: "me",
        name,
        avatar,
        color: "#38bdf8",
        isBot: false,
        totalDepth: 0,
        roundDepth: 0,
        readyInRound: false,
        rerollsLeft: 1,
        oxygen: 100,
        sonarPings: 2,
        sonarUsedRound: 0,
        historyTiers: [],
        bestAnswer: null
      },
      {
        id: "bot-1",
        name: "Kapten Budi (Bot)",
        avatar: "🤿",
        color: "#10b981",
        isBot: true,
        style: "safe",
        totalDepth: 0,
        roundDepth: 0,
        readyInRound: false,
        rerollsLeft: 0,
        oxygen: 100,
        sonarPings: 2,
        sonarUsedRound: 0,
        historyTiers: [],
        bestAnswer: null
      },
      {
        id: "bot-2",
        name: "Prof. Nadya (Bot)",
        avatar: "🐙",
        color: "#c084fc",
        isBot: true,
        style: "scholar",
        totalDepth: 0,
        roundDepth: 0,
        readyInRound: false,
        rerollsLeft: 0,
        oxygen: 100,
        sonarPings: 2,
        sonarUsedRound: 0,
        historyTiers: [],
        bestAnswer: null
      },
      {
        id: "bot-3",
        name: "Siska Anti-Mainstream",
        avatar: "🦈",
        color: "#f43f5e",
        isBot: true,
        style: "hipster",
        totalDepth: 0,
        roundDepth: 0,
        readyInRound: false,
        rerollsLeft: 0,
        oxygen: 100,
        sonarPings: 2,
        sonarUsedRound: 0,
        historyTiers: [],
        bestAnswer: null
      }
    ]
  };

  advanceLocalRound();
}

function advanceLocalRound() {
  clearClientTimers();
  currentRoom.currentRound += 1;
  if (currentRoom.currentRound > currentRoom.selectedCategories.length) {
    finishLocalGame();
    return;
  }

  currentRoom.state = "PLAYING";
  currentRoom.roundSubmissions = {};
  currentRoom.players.forEach((p) => {
    p.readyInRound = false;
    p.roundDepth = 0;
  });

  const cat = currentRoom.selectedCategories[currentRoom.currentRound - 1];
  currentRoom.category = {
    id: cat.id,
    title: cat.title,
    theme: cat.theme,
    hint: cat.hint,
    educationalNote: cat.educationalNote,
    totalPossibleAnswers: cat.answers.length
  };

  const deadline = Date.now() + 25000;
  renderGameScreen(currentRoom);
  handleRoundStartUI({
    round: currentRoom.currentRound,
    roundsTotal: currentRoom.roundsTotal,
    deadline,
    serverNow: Date.now(),
    category: currentRoom.category
  });

  // Jadwalkan jawaban 3 AI Bot di dalam HP
  currentRoom.players
    .filter((p) => p.isBot)
    .forEach((bot) => {
      const delay = 3500 + Math.random() * 11000;
      const t = setTimeout(() => {
        if (!isLocalOfflineGame || currentRoom.state !== "PLAYING") return;
        let pool = cat.answers;
        if (bot.style === "safe") pool = cat.answers.filter((a) => a.score <= 58);
        else if (bot.style === "scholar") pool = cat.answers.filter((a) => a.score >= 55);
        else if (bot.style === "hipster") pool = cat.answers.filter((a) => a.score >= 38 && a.score <= 92);
        if (!pool.length) pool = cat.answers;
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        currentRoom.roundSubmissions[bot.id] = {
          rawInput: chosen.name,
          match: {
            canonicalName: chosen.name,
            baseScore: chosen.score,
            fact: chosen.fact,
            tier: getTierInfo(chosen.score)
          }
        };
        bot.readyInRound = true;
        renderGameScreen(currentRoom);
        checkLocalAllReady();
      }, delay);
      localBotTimeouts.push(t);
    });
}

function checkLocalAllReady() {
  if (!isLocalOfflineGame || currentRoom.state !== "PLAYING") return;
  if (currentRoom.players.every((p) => p.readyInRound)) {
    setTimeout(() => {
      if (isLocalOfflineGame && currentRoom.state === "PLAYING") {
        revealLocalRound();
      }
    }, 550);
  }
}

function revealLocalRound() {
  if (!isLocalOfflineGame || currentRoom.state !== "PLAYING") return;
  clearClientTimers();
  currentRoom.state = "REVEAL";
  const cat = currentRoom.selectedCategories[currentRoom.currentRound - 1];

  const counts = {};
  Object.values(currentRoom.roundSubmissions).forEach((s) => {
    if (s && s.match) {
      counts[s.match.canonicalName] = (counts[s.match.canonicalName] || 0) + 1;
    }
  });

  const highTier = Object.entries(currentRoom.roundSubmissions).filter(
    ([, s]) => s && s.match && s.match.baseScore >= 65 && counts[s.match.canonicalName] === 1
  );
  let soleId = null;
  if (highTier.length > 0) {
    highTier.sort((a, b) => b[1].match.baseScore - a[1].match.baseScore);
    soleId = highTier[0][0];
  }

  const results = [];
  let rarestGuessed = null;

  currentRoom.players.forEach((p) => {
    const sub = currentRoom.roundSubmissions[p.id];
    if (!sub || !sub.match) {
      const o0 = p.oxygen;
      p.oxygen = Math.max(0, p.oxygen - 30);
      p.roundDepth = 0;
      p.historyTiers.push("⚫");
      results.push({
        playerId: p.id,
        playerName: p.name,
        playerAvatar: p.avatar,
        playerColor: p.color,
        oxygenDelta: p.oxygen - o0,
        oxygenAfter: p.oxygen,
        answered: false,
        canonicalName: "Kehabisan Oksigen (Tidak Menjawab)",
        baseScore: 0,
        depthGained: 0,
        totalDepth: p.totalDepth,
        tier: { id: "MISSED", name: "KEHABISAN WAKTU", emoji: "⚫", color: "#64748b" },
        isCollision: false,
        isSoleExplorer: false,
        fact: ""
      });
      return;
    }

    const { canonicalName, baseScore, fact, tier } = sub.match;
    const isCollision = currentRoom.settings.collisionRule && counts[canonicalName] > 1;
    const isSoleExplorer = p.id === soleId && !isCollision;

    let depthGained = baseScore * 10;
    if (isCollision) depthGained = Math.round(depthGained * 0.5);
    if (isSoleExplorer) depthGained += 150;

    // Sistem Oksigen (sama seperti mode online)
    const suffocating = p.oxygen <= 0;
    if (suffocating) depthGained = Math.round(depthGained * 0.7);
    const o0 = p.oxygen;
    let oxDelta = { PLANKTON: -12, KARANG: -4, ABISAL: 6, LEGENDA: 12 }[tier.id] || 0;
    if (isCollision) oxDelta -= 10;
    p.oxygen = Math.max(0, Math.min(100, p.oxygen + oxDelta));

    p.roundDepth = depthGained;
    p.totalDepth += depthGained;
    p.historyTiers.push(isCollision ? "💥" : tier.emoji);

    if (!p.bestAnswer || depthGained > p.bestAnswer.depthGained) {
      p.bestAnswer = {
        categoryTitle: cat.title,
        answerName: canonicalName,
        depthGained,
        tierEmoji: tier.emoji,
        tierName: tier.name,
        fact
      };
    }

    if (!rarestGuessed || baseScore > rarestGuessed.baseScore) {
      rarestGuessed = { canonicalName, baseScore, fact, tier, finderName: p.name };
    }

    results.push({
      playerId: p.id,
      playerName: p.name,
      playerAvatar: p.avatar,
      playerColor: p.color,
      answered: true,
      canonicalName,
      baseScore,
      depthGained,
      totalDepth: p.totalDepth,
      tier,
      isCollision,
      collisionWithCount: counts[canonicalName],
      isSoleExplorer,
      oxygenDelta: p.oxygen - o0,
      oxygenAfter: p.oxygen,
      suffocating,
      fact
    });
  });

  results.sort((a, b) => b.depthGained - a.depthGained);

  const myRes = results.find((r) => r.playerId === "me");
  if (myRes && typeof showOxygenToast === "function") showOxygenToast(myRes);

  const legendaryExamples = [...cat.answers]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((a) => ({
      name: a.name,
      score: a.score,
      depthMeters: a.score * 10,
      fact: a.fact
    }));

  renderGameScreen(currentRoom);
  handleRoundRevealUI({
    round: currentRoom.currentRound,
    roundsTotal: currentRoom.roundsTotal,
    categoryTitle: cat.title,
    educationalNote: cat.educationalNote,
    results,
    rarestGuessed,
    legendaryExamples,
    nextRoundInMs: 13000
  });

  const t = setTimeout(() => {
    if (isLocalOfflineGame) advanceLocalRound();
  }, 13000);
  localBotTimeouts.push(t);
}

function finishLocalGame() {
  clearClientTimers();
  currentRoom.state = "GAMEOVER";
  const standings = [...currentRoom.players].sort((a, b) => b.totalDepth - a.totalDepth);
  const today = new Date().toISOString().slice(0, 10);
  handleGameOverUI({
    isDaily: currentRoom.isDaily,
    dateKey: today,
    gameMode: currentRoom.settings.gameMode,
    standings,
    teamTotalDepth: standings.reduce((s, p) => s + p.totalDepth, 0)
  });
}

// ============================================================================
// LATAR BELAKANG SAMUDRA INTERAKTIF (CANVAS GELEMBUNG & SONAR)
// ============================================================================
const canvas = document.getElementById("ocean-canvas");
const ctx = canvas.getContext("2d");
let bubbles = [];
let sonarRipples = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

for (let i = 0; i < 40; i++) {
  bubbles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: 1.5 + Math.random() * 4.5,
    speed: 0.35 + Math.random() * 0.9,
    alpha: 0.12 + Math.random() * 0.35
  });
}

function triggerSonarRipple(color = "rgba(56, 189, 248, 0.45)") {
  sonarRipples.push({
    x: window.innerWidth / 2,
    y: window.innerHeight / 2,
    r: 20,
    maxR: Math.max(window.innerWidth, window.innerHeight) * 0.65,
    alpha: 0.5,
    color
  });
}

function animateOcean() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bubbles.forEach((b) => {
    b.y -= b.speed;
    b.x += Math.sin(b.y * 0.02) * 0.3;
    if (b.y < -10) {
      b.y = canvas.height + 10;
      b.x = Math.random() * canvas.width;
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(125, 211, 252, ${b.alpha})`;
    ctx.fill();
  });

  for (let i = sonarRipples.length - 1; i >= 0; i--) {
    const rp = sonarRipples[i];
    rp.r += 9;
    rp.alpha *= 0.96;
    ctx.beginPath();
    ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
    ctx.strokeStyle = rp.color.replace(/[\d.]+\)$/g, `${rp.alpha})`);
    ctx.lineWidth = 2.5;
    ctx.stroke();
    if (rp.r >= rp.maxR || rp.alpha < 0.02) {
      sonarRipples.splice(i, 1);
    }
  }

  requestAnimationFrame(animateOcean);
}
animateOcean();

// ============================================================================
// FETCH INFO AWAL, DETEKSI IP WI-FI LOKAL, & QR CODE RENDERER
// ============================================================================
async function loadHomeInfo() {
  const localCats = getLocalCategories();
  const localAnsCount = localCats.reduce((s, c) => s + c.answers.length, 0);
  document.getElementById("stat-total-categories").textContent = localCats.length;
  document.getElementById("stat-total-answers").textContent = `${localAnsCount}+`;

  try {
    const res = await fetch(`${apiBaseUrl}/api/info`);
    const data = await res.json();

    document.getElementById("stat-total-categories").textContent = data.totalCategories;
    document.getElementById("stat-total-answers").textContent = `${data.totalAnswers}+`;
    document.getElementById("badge-today-date").textContent = `#${data.todayKey}`;
    const isLocalHost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      isCapacitorNative;
    if (isLocalHost && data.lanUrl) {
      lanBaseUrl = data.lanUrl;
    } else if (!isLocalHost) {
      lanBaseUrl = window.location.origin;
    }
    document.getElementById("lan-url-display").textContent = lanBaseUrl;

    const lbContainer = document.getElementById("daily-leaderboard-list");
    if (!data.dailyLeaderboard || data.dailyLeaderboard.length === 0) {
      lbContainer.innerHTML = `<div class="empty-state">Belum ada penyelaman hari ini. Klik <strong>Tantangan Harian</strong> dan jadilah juara pertama hari ini!</div>`;
    } else {
      lbContainer.innerHTML = data.dailyLeaderboard
        .map(
          (item, idx) => `
          <div class="lb-item">
            <div class="lb-left">
              <span class="lb-rank">#${idx + 1}</span>
              <span>${item.avatar || "🤿"}</span>
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div style="font-size:0.7rem;color:#94a3b8;">${item.tiers || ""}</div>
              </div>
            </div>
            <span class="lb-depth">${formatMeters(item.totalDepth)}</span>
          </div>
        `
        )
        .join("");
    }

    const prContainer = document.getElementById("public-rooms-list");
    if (!data.publicRooms || data.publicRooms.length === 0) {
      prContainer.innerHTML = `<div class="empty-state">Belum ada room publik di lobby. Klik <strong>Arena Cepat</strong> atau <strong>Buat Room Party</strong>!</div>`;
    } else {
      prContainer.innerHTML = data.publicRooms
        .map(
          (r) => `
          <div class="lb-item">
            <div class="lb-left">
              <strong style="color:#facc15;letter-spacing:1px;">${r.code}</strong>
              <span>• Host: ${escapeHtml(r.hostName)} (${r.playerCount}/8)</span>
            </div>
            <button class="btn-small" onclick="joinRoomByCode('${r.code}')">Gabung</button>
          </div>
        `
        )
        .join("");
    }
    document.getElementById("conn-text").textContent = "Server Online";
    document.getElementById("conn-dot").style.background = "#10b981";
  } catch (err) {
    // Jika berjalan di APK Offline tanpa server, tampilkan status Mandiri singkat (1 baris)
    document.getElementById("conn-text").textContent = "Mode Mandiri";
    document.getElementById("conn-dot").style.background = "#38bdf8";
  }
}

if (socket) {
  socket.on("connect", () => {
    document.getElementById("conn-text").textContent = "Server Online";
    document.getElementById("conn-dot").style.background = "#10b981";
  });
  socket.on("disconnect", () => {
    document.getElementById("conn-text").textContent = "Mode Mandiri";
    document.getElementById("conn-dot").style.background = "#38bdf8";
  });
}

loadHomeInfo();

// Cek jika URL memiliki parameter ?room=ABCD (dari hasil scan QR / klik link WA)
window.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get("room");
  if (roomParam && roomParam.length === 4) {
    setTimeout(() => {
      window.joinRoomByCode(roomParam.toUpperCase());
    }, 450);
  }
});

// Generator QR Code Standar ISO (Bisa langsung di-scan kamera HP / Google Lens!)
async function drawVisualQrCode(text) {
  const qrCanvas = document.getElementById("qr-canvas");
  if (!qrCanvas) return;
  const qctx = qrCanvas.getContext("2d");

  try {
    const res = await fetch(`${apiBaseUrl}/api/qr?text=${encodeURIComponent(text)}`);
    const data = await res.json();
    if (data && data.dataUrl) {
      const img = new Image();
      img.onload = () => {
        qctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
        qctx.drawImage(img, 0, 0, qrCanvas.width, qrCanvas.height);
      };
      img.src = data.dataUrl;
      return;
    }
  } catch (err) {
    // Fallback jika sedang offline tanpa server
  }

  const size = 21;
  const cell = Math.floor(qrCanvas.width / size);
  qctx.fillStyle = "#ffffff";
  qctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);

  function drawFinder(ox, oy) {
    qctx.fillStyle = "#040d1a";
    qctx.fillRect(ox * cell, oy * cell, 7 * cell, 7 * cell);
    qctx.fillStyle = "#ffffff";
    qctx.fillRect((ox + 1) * cell, (oy + 1) * cell, 5 * cell, 5 * cell);
    qctx.fillStyle = "#0284c7";
    qctx.fillRect((ox + 2) * cell, (oy + 2) * cell, 3 * cell, 3 * cell);
  }

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);
}

function openMobileHubModal(roomCode = null) {
  const modal = document.getElementById("modal-mobile-hub");
  const targetUrl =
    roomCode && roomCode.length === 4 ? `${lanBaseUrl}/r/${roomCode}` : lanBaseUrl;
  document.getElementById("lan-url-display").textContent = targetUrl;
  const inputServer = document.getElementById("input-server-url");
  if (inputServer) {
    inputServer.value =
      localStorage.getItem("palung_server_url") ||
      window.PALUNG_DEFAULT_SERVER ||
      lanBaseUrl ||
      "http://192.168.1.9:3000";
  }
  drawVisualQrCode(targetUrl);
  modal.classList.remove("hidden");
}

const btnSaveServerUrl = document.getElementById("btn-save-server-url");
if (btnSaveServerUrl) {
  btnSaveServerUrl.addEventListener("click", () => {
    const val = document.getElementById("input-server-url").value.trim().replace(/\/+$/, "");
    if (!val) return;
    localStorage.setItem("palung_server_url", val);
    showToast(`🌐 Menyambungkan ke server: ${val}...`);
    setTimeout(() => window.location.reload(), 600);
  });
}

document.getElementById("btn-open-mobile-hub").addEventListener("click", () => {
  openMobileHubModal(currentRoom && !isLocalOfflineGame ? currentRoom.code : null);
});

document.getElementById("btn-close-mobile-hub").addEventListener("click", () => {
  document.getElementById("modal-mobile-hub").classList.add("hidden");
});

document.getElementById("btn-copy-lan-url").addEventListener("click", () => {
  const url = document.getElementById("lan-url-display").textContent;
  navigator.clipboard.writeText(url);
  playDiveLock();
  showToast("📋 Link berhasil disalin!");
});

document.getElementById("btn-share-app-wa").addEventListener("click", () => {
  const url = document.getElementById("lan-url-display").textContent;
  const text = `🌊 Ayo main PALUNG.IO bareng! Tebak jawaban paling langka & selam ke dasar Palung Mariana:\n${url}`;
  if (navigator.share) {
    navigator.share({ title: "PALUNG.IO", text, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
});

// Navigasi Tab di Beranda
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    loadHomeInfo();
  });
});

// ============================================================================
// AKSI TOMBOL BERANDA (ONLINE MULTIPLAYER & OFFLINE FALLBACK)
// ============================================================================
document.getElementById("btn-quick-match").addEventListener("click", () => {
  const { name, avatar } = getIdentity();
  playDiveLock();

  if (!socket || !socket.connected) {
    startLocalOfflineMatch({ isDaily: false });
    showToast("📱 Menjalankan Arena Cepat dalam Mode Mandiri HP (vs 3 AI Bot)!");
    return;
  }

  isLocalOfflineGame = false;
  socket.emit("room:quickmatch", { name, avatar, theme: "all" }, (res) => {
    if (res && res.success) {
      currentRoom = res.room;
      renderLobby(currentRoom);
      showScreen("lobby");
      showToast("⚡ Masuk ke Arena! Klik 'MULAI MENYELAM!' atau undang teman.");
    }
  });
});

document.getElementById("btn-daily-challenge").addEventListener("click", () => {
  const { name, avatar } = getIdentity();
  playDiveLock();

  if (!socket || !socket.connected) {
    startLocalOfflineMatch({ isDaily: true });
    showToast("🏆 Tantangan Harian dimulai (Mode Mandiri HP)!");
    return;
  }

  isLocalOfflineGame = false;
  socket.emit("room:daily", { name, avatar, withBots: true }, (res) => {
    if (res && res.success) {
      currentRoom = res.room;
      showScreen("game");
      showToast("🏆 Tantangan Harian dimulai! Bersaing dengan 2 AI Bot Pembanding.");
    }
  });
});

document.getElementById("btn-offline-solo").addEventListener("click", () => {
  playDiveLock();
  startLocalOfflineMatch({ isDaily: false });
  showToast("📱 Mode Mandiri HP dimulai! 100% berjalan di perangkatmu melawan 3 AI Bot.");
});

document.getElementById("btn-create-room").addEventListener("click", () => {
  const { name, avatar } = getIdentity();
  playSonarPing(660, 0.15);

  if (!socket || !socket.connected) {
    startLocalOfflineMatch({ isDaily: false });
    return;
  }

  isLocalOfflineGame = false;
  socket.emit("room:create", { name, avatar, isPublic: true }, (res) => {
    if (res && res.success) {
      currentRoom = res.room;
      renderLobby(currentRoom);
      showScreen("lobby");
    }
  });
});

document.getElementById("btn-join-room").addEventListener("click", () => {
  const code = document.getElementById("input-room-code").value.trim().toUpperCase();
  if (!code || code.length < 4) {
    showToast("⚠️ Masukkan 4 huruf Kode Room terlebih dahulu!");
    return;
  }
  window.joinRoomByCode(code);
});

window.joinRoomByCode = function (code) {
  if (!socket || !socket.connected) {
    showToast("⚠️ Tidak terhubung ke server multiplayer. Gunakan Mode Mandiri HP.");
    return;
  }
  const { name, avatar } = getIdentity();
  isLocalOfflineGame = false;
  socket.emit("room:join", { code, name, avatar }, (res) => {
    if (!res || !res.success) {
      playErrorBuzz();
      showToast(res ? res.error : "Gagal bergabung ke room.");
      return;
    }
    playDiveLock();
    currentRoom = res.room;
    if (currentRoom.state === "LOBBY") {
      renderLobby(currentRoom);
      showScreen("lobby");
    } else {
      renderGameScreen(currentRoom);
      showScreen("game");
    }
  });
};

// Kembali ke Beranda
document.getElementById("btn-home-logo").addEventListener("click", () => {
  if (currentRoom && !isLocalOfflineGame && socket) {
    socket.emit("room:leave");
  }
  currentRoom = null;
  isLocalOfflineGame = false;
  clearClientTimers();
  showScreen("home");
  loadHomeInfo();
});

document.getElementById("btn-leave-lobby").addEventListener("click", () => {
  if (socket && !isLocalOfflineGame) socket.emit("room:leave");
  currentRoom = null;
  isLocalOfflineGame = false;
  clearClientTimers();
  showScreen("home");
  loadHomeInfo();
});

// ============================================================================
// LAYAR LOBBY MULTIPLAYER
// ============================================================================
function renderLobby(room) {
  document.getElementById("lobby-room-code").textContent = room.code;
  document.getElementById("lobby-player-count").textContent = room.players.length;

  const myId = socket ? socket.id : "me";
  const isHost = room.hostId === myId;
  const playersContainer = document.getElementById("lobby-players-list");

  playersContainer.innerHTML = room.players
    .map(
      (p) => `
      <div class="player-lobby-card" style="border-color: ${p.color}55">
        <div class="p-info">
          <span class="p-avatar">${p.avatar}</span>
          <div>
            <span class="p-name">${escapeHtml(p.name)} ${p.id === myId ? "(Kamu)" : ""}</span>
            <span class="p-tag">${
              p.isBot ? "🤖 AI Bot Penyelam" : p.id === room.hostId ? "👑 Kapten Host" : "🤿 Penyelam"
            }</span>
          </div>
        </div>
        ${
          p.isBot
            ? `<button class="btn-remove-bot" onclick="removeBot('${p.id}')" title="Hapus Bot">✕</button>`
            : ""
        }
      </div>
    `
    )
    .join("");

  const selMode = document.getElementById("setting-gamemode");
  const selTheme = document.getElementById("setting-theme");
  const selRounds = document.getElementById("setting-rounds");
  const selDuration = document.getElementById("setting-duration");
  const chkCollision = document.getElementById("setting-collision");

  selMode.value = room.settings.gameMode || "competitive";
  selTheme.value = room.settings.theme || "all";
  selRounds.value = String(room.settings.roundsTotal || 7);
  selDuration.value = String(room.settings.roundDuration || 25);
  chkCollision.checked = room.settings.collisionRule !== false;

  [selMode, selTheme, selRounds, selDuration, chkCollision].forEach((el) => {
    el.disabled = !isHost;
  });
}

window.removeBot = function (botId) {
  if (socket) socket.emit("room:removeBot", { botId });
};

document.getElementById("btn-add-bot").addEventListener("click", () => {
  playSonarPing(740, 0.12);
  if (socket) socket.emit("room:addBot");
});

document.getElementById("btn-copy-code").addEventListener("click", () => {
  if (!currentRoom) return;
  navigator.clipboard.writeText(currentRoom.code);
  showToast(`📋 Kode Room ${currentRoom.code} berhasil disalin!`);
});

document.getElementById("btn-qr-room").addEventListener("click", () => {
  if (!currentRoom) return;
  openMobileHubModal(currentRoom.code);
});

["setting-gamemode", "setting-theme", "setting-rounds", "setting-duration", "setting-collision"].forEach(
  (id) => {
    document.getElementById(id).addEventListener("change", () => {
      if (!socket) return;
      socket.emit("room:settings", {
        gameMode: document.getElementById("setting-gamemode").value,
        theme: document.getElementById("setting-theme").value,
        roundsTotal: Number(document.getElementById("setting-rounds").value),
        roundDuration: Number(document.getElementById("setting-duration").value),
        collisionRule: document.getElementById("setting-collision").checked
      });
    });
  }
);

document.getElementById("btn-start-game").addEventListener("click", () => {
  playDiveLock();
  if (socket) socket.emit("game:start");
});

// ============================================================================
// LAYAR PERMAINAN (FASE MENJAWAB & VISUALISASI PALUNG)
// ============================================================================
function clearClientTimers() {
  if (typeof stopDescendAnimation === "function") {
    stopDescendAnimation();
  }
  if (roundTimerInterval) {
    clearInterval(roundTimerInterval);
    roundTimerInterval = null;
  }
  if (revealCountdownInterval) {
    clearInterval(revealCountdownInterval);
    revealCountdownInterval = null;
  }
  if (localBotTimeouts.length) {
    localBotTimeouts.forEach((t) => clearTimeout(t));
    localBotTimeouts = [];
  }
}

function updateAmbientDepthZone(depthMeters) {
  let zoneName = "Zona Sinar Matahari";
  if (depthMeters >= 6000) zoneName = "Zona Hadal (Palung Terdalam!)";
  else if (depthMeters >= 4000) zoneName = "Zona Abisal";
  else if (depthMeters >= 1500) zoneName = "Zona Tengah Malam";
  else if (depthMeters >= 500) zoneName = "Zona Senja";

  ambientZoneText.textContent = `${zoneName} (${formatMeters(depthMeters)})`;
}

function renderSubmarineTrench(room) {
  const track = document.getElementById("submarines-track");
  const maxScaleDepth = (room.roundsTotal || 7) * 1000;
  const count = room.players.length || 1;
  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";

  track.innerHTML = room.players
    .map((p, idx) => {
      const pctDepth = Math.min(96, Math.max(4, (p.totalDepth / maxScaleDepth) * 94));
      const leftPct = count === 1 ? 50 : 14 + (idx / (count - 1)) * 72;
      return `
        <div class="sub-marker ${p.readyInRound ? "ready" : ""}" style="top: ${pctDepth}%; left: ${leftPct}%;">
          <div class="sub-bubble-icon" style="border-color: ${p.readyInRound ? "#10b981" : p.color}">
            ${p.avatar}
          </div>
          <span class="sub-name-tag">${escapeHtml(p.name.slice(0, 10))} • ${formatMeters(p.totalDepth)}</span>
        </div>
      `;
    })
    .join("");

  const sorted = [...room.players].sort((a, b) => b.totalDepth - a.totalDepth);
  const sideList = document.getElementById("game-sidebar-players");
  sideList.innerHTML = sorted
    .map(
      (p, i) => `
      <div class="side-player-row ${p.readyInRound ? "is-ready" : ""}">
        <div class="sp-left">
          <strong style="color:#94a3b8;width:18px;">#${i + 1}</strong>
          <span>${p.avatar}</span>
          <span>${escapeHtml(p.name)}</span>
          <span>${p.readyInRound ? "✅" : "💭"}</span>
        </div>
        <span class="sp-depth">${formatMeters(p.totalDepth)}</span>
      </div>
    `
    )
    .join("");

  // Update Compact Mobile Radar Strip (Untuk Tampilan HP Portrait)
  document.getElementById("mobile-round-pill").textContent = `Ronde ${room.currentRound}/${room.roundsTotal}`;
  const myPlayer = room.players.find((p) => p.id === myId) || room.players[0];
  if (myPlayer) {
    updateAmbientDepthZone(myPlayer.totalDepth);
    document.getElementById("mobile-my-depth").textContent = `⚓ ${formatMeters(myPlayer.totalDepth)}`;
  }

  const mobileStrip = document.getElementById("mobile-subs-strip");
  mobileStrip.innerHTML = sorted
    .map(
      (p) => `
      <div class="mcr-chip ${p.readyInRound ? "ready" : ""}">
        <span>${p.avatar}</span>
        <span>${escapeHtml(p.name.slice(0, 8))}</span>
        <span style="color:#38bdf8">${formatMeters(p.totalDepth)}</span>
        <span>${p.readyInRound ? "✅" : ""}</span>
      </div>
    `
    )
    .join("");
}

function renderGameScreen(room) {
  document.getElementById("game-round-indicator").textContent = `Ronde ${room.currentRound}/${room.roundsTotal}`;
  document.getElementById("trench-room-title").textContent = room.isDaily
    ? "Tantangan Harian (7.000m)"
    : isLocalOfflineGame
    ? "Mode Mandiri HP (Offline)"
    : room.settings.gameMode === "coop"
    ? "Ekspedisi Tim Co-op"
    : `Arena Room ${room.code}`;

  renderSubmarineTrench(room);

  if (room.category) {
    const themeLabels = {
      sains: "🧬 SAINS & ALAM",
      nusantara: "🇮🇩 BUDAYA & NUSANTARA",
      geografi: "🗺️ GEOGRAFI & DUNIA",
      umum: "💡 PENGETAHUAN UMUM"
    };
    document.getElementById("game-category-theme").textContent =
      themeLabels[room.category.theme] || "🌍 PENGETAHUAN";
    document.getElementById("game-category-count").textContent = `📡 ${room.category.totalPossibleAnswers}+ Jawaban di Radar`;
    document.getElementById("game-category-title").textContent = room.category.title;
    document.getElementById("game-category-hint").textContent = room.category.hint;
  }
}

function handleRoundStartUI(payload) {
  showScreen("game");
  setBgmMood("diving");
  triggerSonarRipple("rgba(56, 189, 248, 0.5)");
  playSonarPing(784, 0.2);

  document.getElementById("phase-playing").classList.remove("hidden");
  document.getElementById("phase-descend").classList.add("hidden");
  document.getElementById("phase-reveal").classList.add("hidden");

  const inputAnswer = document.getElementById("input-answer");
  const formAnswer = document.getElementById("form-answer");
  const lockedPanel = document.getElementById("locked-answer-panel");
  const feedback = document.getElementById("sonar-feedback");

  formAnswer.classList.remove("hidden");
  lockedPanel.classList.add("hidden");
  feedback.textContent = "";
  feedback.className = "sonar-feedback";
  inputAnswer.value = "";
  inputAnswer.disabled = false;
  inputAnswer.focus();

  const totalDurationMs =
    (currentRoom && currentRoom.settings ? currentRoom.settings.roundDuration : 25) * 1000;
  const clockOffset = Date.now() - (payload.serverNow || Date.now());
  const localDeadline = payload.deadline + clockOffset;
  lastTickSecond = -1;

  roundTimerInterval = setInterval(() => {
    const remainingMs = Math.max(0, localDeadline - Date.now());
    const remainingSec = Math.ceil(remainingMs / 1000);
    const pct = Math.max(0, Math.min(100, (remainingMs / totalDurationMs) * 100));

    document.getElementById("game-timer-seconds").textContent = remainingSec;
    document.getElementById("game-timer-bar").style.width = `${pct}%`;

    const timerBox = document.getElementById("timer-box");
    if (remainingSec <= 7 && remainingSec > 0) {
      if (bgmMood !== "urgent") setBgmMood("urgent");
    }
    if (remainingSec <= 5 && remainingSec > 0) {
      timerBox.classList.add("urgent");
      if (lastTickSecond !== remainingSec) {
        lastTickSecond = remainingSec;
        playSonarPing(987.77, 0.08);
      }
    } else {
      timerBox.classList.remove("urgent");
    }

    if (remainingMs <= 0) {
      clearInterval(roundTimerInterval);
      setBgmMood("calm");
      if (isLocalOfflineGame) {
        revealLocalRound();
      }
    }
  }, 100);
}

if (socket) {
  socket.on("round:start", (payload) => {
    clearClientTimers();
    handleRoundStartUI(payload);
  });
}

// Submit Jawaban (Mendukung Online Server & Offline Mandiri HP)
document.getElementById("form-answer").addEventListener("submit", (e) => {
  e.preventDefault();
  const inputAnswer = document.getElementById("input-answer");
  const raw = inputAnswer.value.trim();
  if (!raw) return;

  const feedback = document.getElementById("sonar-feedback");
  const wrapper = document.getElementById("input-sonar-wrapper");

  if (isLocalOfflineGame) {
    const cat = currentRoom.selectedCategories[currentRoom.currentRound - 1];
    const match = matchLocalAnswer(cat, raw);
    if (!match) {
      playErrorBuzz();
      wrapper.classList.remove("shake");
      void wrapper.offsetWidth;
      wrapper.classList.add("shake");
      feedback.textContent = `❌ Sonar tidak mendeteksi "${raw}" di kategori ini. Coba istilah lain!`;
      feedback.className = "sonar-feedback error";
      inputAnswer.select();
      return;
    }

    const me = currentRoom.players.find((p) => p.id === "me");
    currentRoom.roundSubmissions["me"] = { rawInput: raw, match };
    me.readyInRound = true;
    lockAnswerUI(match.canonicalName, match.tier.name, me.rerollsLeft);
    renderGameScreen(currentRoom);
    checkLocalAllReady();
    return;
  }

  socket.emit("round:submit", { answer: raw }, (res) => {
    if (!res) return;
    if (!res.valid) {
      playErrorBuzz();
      wrapper.classList.remove("shake");
      void wrapper.offsetWidth;
      wrapper.classList.add("shake");
      feedback.textContent = `❌ ${res.message}`;
      feedback.className = "sonar-feedback error";
      inputAnswer.select();
      return;
    }
    lockAnswerUI(res.canonicalName, res.tierHint, res.rerollsLeft);
  });
});

function lockAnswerUI(canonicalName, tierHint, rerollsLeft) {
  playDiveLock();
  triggerSonarRipple("rgba(16, 185, 129, 0.55)");
  const feedback = document.getElementById("sonar-feedback");
  feedback.textContent = `📡 Sinyal terdeteksi di ${tierHint}!`;
  feedback.className = "sonar-feedback success";

  document.getElementById("form-answer").classList.add("hidden");
  const lockedPanel = document.getElementById("locked-answer-panel");
  lockedPanel.classList.remove("hidden");
  document.getElementById("locked-answer-name").textContent = canonicalName;

  const btnReroll = document.getElementById("btn-use-reroll");
  document.getElementById("reroll-count").textContent = rerollsLeft;
  btnReroll.disabled = rerollsLeft <= 0;
}

// Fitur Sonar Cadangan (1x Ganti Jawaban)
document.getElementById("btn-use-reroll").addEventListener("click", () => {
  if (isLocalOfflineGame) {
    const me = currentRoom.players.find((p) => p.id === "me");
    if (!me || me.rerollsLeft <= 0) return;
    me.rerollsLeft -= 1;
    me.readyInRound = false;
    delete currentRoom.roundSubmissions["me"];
    unlockRerollUI();
    renderGameScreen(currentRoom);
    return;
  }

  socket.emit("round:reroll", (res) => {
    if (!res || !res.success) {
      showToast(res ? res.message : "Sonar Cadangan tidak tersedia.");
      return;
    }
    unlockRerollUI();
  });
});

function unlockRerollUI() {
  playSonarPing(660, 0.15);
  triggerHaptic(30);
  document.getElementById("locked-answer-panel").classList.add("hidden");
  document.getElementById("form-answer").classList.remove("hidden");
  const inputAnswer = document.getElementById("input-answer");
  inputAnswer.value = "";
  inputAnswer.focus();
  document.getElementById("sonar-feedback").textContent =
    "🔄 Sonar Cadangan aktif! Ketik jawaban yang lebih langka sebelum waktu habis!";
}

// ============================================================================
// ANIMASI GROUP DESCEND ALA KRILLION.IO (PARALLAX LAUT DALAM + KAPAL SELAM)
// ============================================================================
let descendRafId = null;
let descendFinishCallback = null;

function stopDescendAnimation() {
  if (descendRafId) {
    cancelAnimationFrame(descendRafId);
    descendRafId = null;
  }
  descendFinishCallback = null;
}

const btnSkipDescend = document.getElementById("btn-skip-descend");
if (btnSkipDescend) {
  btnSkipDescend.addEventListener("click", () => {
    const cb = descendFinishCallback;
    stopDescendAnimation();
    if (typeof cb === "function") cb();
  });
}

function lerpNum(a, b, t) {
  return a + (b - a) * t;
}

function getOceanColorsAtDepth(depth) {
  // Stops: 0m (Matahari) -> 350m (Karang) -> 650m (Abisal) -> 950m (Hadal)
  const stops = [
    { d: 0, top: [2, 132, 199], bot: [3, 105, 161] },
    { d: 350, top: [3, 105, 161], bot: [30, 58, 138] },
    { d: 650, top: [30, 27, 75], bot: [15, 7, 40] },
    { d: 950, top: [9, 3, 20], bot: [2, 1, 8] }
  ];
  let s0 = stops[0];
  let s1 = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (depth >= stops[i].d && depth <= stops[i + 1].d) {
      s0 = stops[i];
      s1 = stops[i + 1];
      break;
    }
  }
  if (depth >= s1.d) {
    s0 = s1;
  }
  const span = Math.max(1, s1.d - s0.d);
  const t = Math.min(1, Math.max(0, (depth - s0.d) / span));
  const rT = Math.round(lerpNum(s0.top[0], s1.top[0], t));
  const gT = Math.round(lerpNum(s0.top[1], s1.top[1], t));
  const bT = Math.round(lerpNum(s0.top[2], s1.top[2], t));
  const rB = Math.round(lerpNum(s0.bot[0], s1.bot[0], t));
  const gB = Math.round(lerpNum(s0.bot[1], s1.bot[1], t));
  const bB = Math.round(lerpNum(s0.bot[2], s1.bot[2], t));
  return {
    top: `rgb(${rT},${gT},${bT})`,
    bot: `rgb(${rB},${gB},${bB})`
  };
}

function getZoneLabelAtDepth(depth) {
  if (depth >= 890) return { text: "🟡 LEGENDA PALUNG", color: "#facc15" };
  if (depth >= 650) return { text: "🟣 ZONA ABISAL", color: "#c084fc" };
  if (depth >= 350) return { text: "🔵 TERUMBU KARANG", color: "#38bdf8" };
  return { text: "🟢 ZONA PLANKTON", color: "#10b981" };
}

function playGroupDescendAnimation(payload, onDone) {
  stopDescendAnimation();
  const phaseDescend = document.getElementById("phase-descend");
  const dCanvas = document.getElementById("descend-canvas");
  if (!phaseDescend || !dCanvas) {
    onDone();
    return;
  }

  document.getElementById("phase-playing").classList.add("hidden");
  document.getElementById("phase-reveal").classList.add("hidden");
  phaseDescend.classList.remove("hidden");

  const dCtx = dCanvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = dCanvas.parentElement.getBoundingClientRect();
  const W = Math.max(300, Math.round(rect.width));
  const H = Math.max(260, Math.round(rect.height));
  dCanvas.width = W * dpr;
  dCanvas.height = H * dpr;
  dCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const results = payload.results || [];
  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
  const myResult = results.find((r) => r.playerId === myId) || results[0];
  const myTarget = myResult ? myResult.depthGained : 0;
  const maxTarget = Math.max(320, ...results.map((r) => r.depthGained || 0));

  const zoneBadge = document.getElementById("descend-zone-badge");
  const odometerEl = document.getElementById("descend-depth-counter");
  const answerPillEl = document.getElementById("descend-my-answer-pill");

  if (myResult && myResult.answered) {
    answerPillEl.textContent = `📡 "${myResult.canonicalName}"${
      myResult.isCollision ? " • 💥 Tabrakan!" : myResult.isSoleExplorer ? " • 🌟 Penemu Tunggal!" : ""
    }`;
  } else {
    answerPillEl.textContent = "💨 Kehabisan Oksigen — Tidak Menjawab";
  }

  // Biota laut sesuai kedalaman (0m -> 1150m)
  const creatures = [];
  const creatureBank = [
    { minD: 30, maxD: 340, emoji: "🐠", size: 22, speedX: 0.7 },
    { minD: 60, maxD: 380, emoji: "🐢", size: 28, speedX: -0.55 },
    { minD: 120, maxD: 480, emoji: "🐡", size: 24, speedX: 0.45 },
    { minD: 210, maxD: 620, emoji: "🐬", size: 28, speedX: -0.9 },
    { minD: 330, maxD: 760, emoji: "🪼", size: 28, speedX: 0.25 },
    { minD: 430, maxD: 850, emoji: "🦑", size: 26, speedX: 0.6 },
    { minD: 560, maxD: 980, emoji: "🦈", size: 32, speedX: -1.1 },
    { minD: 720, maxD: 1180, emoji: "🐡", size: 24, speedX: 0.35, glow: "#c084fc" },
    { minD: 820, maxD: 1220, emoji: "🐉", size: 30, speedX: -0.65, glow: "#facc15" }
  ];
  for (let i = 0; i < 24; i++) {
    const tpl = creatureBank[i % creatureBank.length];
    creatures.push({
      depth: tpl.minD + Math.random() * (tpl.maxD - tpl.minD),
      x: 45 + Math.random() * (W - 90),
      emoji: tpl.emoji,
      size: tpl.size,
      speedX: tpl.speedX * (Math.random() > 0.5 ? 1 : -1),
      glow: tpl.glow || null
    });
  }

  // Partikel gelembung & bioluminesensi parallax
  const particles = Array.from({ length: 55 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: 1.2 + Math.random() * 3.4,
    layer: 0.5 + Math.random() * 1.4,
    alpha: 0.2 + Math.random() * 0.6
  }));

  const diveDurationMs = 4100;
  const startTime = performance.now();
  let lastTierSound = 0;
  let lastBubbleTime = 0;
  let prevCamDepth = 0;

  descendFinishCallback = () => {
    phaseDescend.classList.add("hidden");
    onDone();
  };

  function drawSubmarine(x, y, res, camDepth, isMe, tNow) {
    const subW = isMe ? 54 : 44;
    const subH = isMe ? 26 : 22;
    const color = res.playerColor || "#38bdf8";

    dCtx.save();
    dCtx.translate(x, y);

    // Sorot Lampu Kapal Selam ke Bawah (Makin terang di laut gelap)
    const beamAlpha = Math.min(0.42, 0.08 + (camDepth / 1000) * 0.34);
    const beamGrad = dCtx.createLinearGradient(0, 6, 0, 105);
    beamGrad.addColorStop(0, `rgba(186, 230, 253, ${beamAlpha})`);
    beamGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
    dCtx.beginPath();
    dCtx.moveTo(-12, subH / 2);
    dCtx.lineTo(-42, 105);
    dCtx.lineTo(42, 105);
    dCtx.lineTo(12, subH / 2);
    dCtx.closePath();
    dCtx.fillStyle = beamGrad;
    dCtx.fill();

    // Aura Emas untuk Penemu Tunggal
    if (res.isSoleExplorer) {
      dCtx.beginPath();
      dCtx.arc(0, 0, subW * 0.72 + Math.sin(tNow * 0.01) * 3, 0, Math.PI * 2);
      dCtx.strokeStyle = "rgba(250, 204, 21, 0.65)";
      dCtx.lineWidth = 2.5;
      dCtx.stroke();
    }

    // Gelombang Merah jika Tabrakan
    if (res.isCollision && camDepth >= res.depthGained * 0.75) {
      dCtx.beginPath();
      dCtx.arc(0, 0, subW * 0.75 + (tNow % 400) * 0.04, 0, Math.PI * 2);
      dCtx.strokeStyle = "rgba(244, 63, 94, 0.8)";
      dCtx.lineWidth = 2.5;
      dCtx.stroke();
    }

    // Menara Periskop
    dCtx.fillStyle = color;
    dCtx.fillRect(-5, -subH / 2 - 7, 10, 8);

    // Badan Kapal Selam
    dCtx.beginPath();
    dCtx.roundRect(-subW / 2, -subH / 2, subW, subH, subH / 2);
    dCtx.fillStyle = isMe ? "#0f172a" : "#0b192e";
    dCtx.fill();
    dCtx.lineWidth = isMe ? 3 : 2;
    dCtx.strokeStyle = res.isCollision ? "#f43f5e" : color;
    dCtx.stroke();

    // Avatar Penyelam di Jendela
    dCtx.font = `${isMe ? 17 : 14}px sans-serif`;
    dCtx.textAlign = "center";
    dCtx.textBaseline = "middle";
    dCtx.fillText(res.playerAvatar || "🤿", 0, 1);

    // Label Nama & Meteran
    const tagText = `${res.playerName.slice(0, 9)} • +${res.currentDepth}m`;
    dCtx.font = "700 10px Outfit, sans-serif";
    const textW = dCtx.measureText(tagText).width + 12;
    dCtx.fillStyle = isMe ? "rgba(2, 132, 199, 0.9)" : "rgba(4, 13, 26, 0.82)";
    dCtx.beginPath();
    dCtx.roundRect(-textW / 2, -subH / 2 - 26, textW, 16, 6);
    dCtx.fill();
    dCtx.fillStyle = "#ffffff";
    dCtx.fillText(tagText, 0, -subH / 2 - 18);

    if (res.isCollision && camDepth >= res.depthGained * 0.8) {
      dCtx.font = "800 11px Outfit, sans-serif";
      dCtx.fillStyle = "#fda4af";
      dCtx.fillText("💥 TABRAKAN -50%", 0, subH / 2 + 14);
    }

    dCtx.restore();
  }

  function frame(now) {
    const elapsed = now - startTime;
    const rawProgress = Math.min(1, elapsed / diveDurationMs);
    // Ease-out cubic: cepat melesat di awal lalu melambat mendarat di dasar
    const ease = 1 - Math.pow(1 - rawProgress, 3);
    const camDepth = maxTarget * ease;
    const speedM = Math.max(0, camDepth - prevCamDepth);
    prevCamDepth = camDepth;

    // 1. Gradasi Air Sesuai Kedalaman
    const colors = getOceanColorsAtDepth(camDepth);
    const bgGrad = dCtx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, colors.top);
    bgGrad.addColorStop(1, colors.bot);
    dCtx.fillStyle = bgGrad;
    dCtx.fillRect(0, 0, W, H);

    // 2. Sinar Matahari di Zona Dangkal (memudar seiring kedalaman)
    if (camDepth < 420) {
      const rayAlpha = Math.max(0, (1 - camDepth / 420) * 0.22);
      dCtx.save();
      for (let i = 0; i < 4; i++) {
        const rx = W * (0.15 + i * 0.24) + Math.sin(now * 0.001 + i) * 18;
        const rGrad = dCtx.createLinearGradient(rx, 0, rx + 40, H * 0.85);
        rGrad.addColorStop(0, `rgba(186, 230, 253, ${rayAlpha})`);
        rGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
        dCtx.fillStyle = rGrad;
        dCtx.beginPath();
        dCtx.moveTo(rx - 22, 0);
        dCtx.lineTo(rx + 22, 0);
        dCtx.lineTo(rx + 90, H);
        dCtx.lineTo(rx - 30, H);
        dCtx.closePath();
        dCtx.fill();
      }
      dCtx.restore();
    }

    // 3. Dinding Tebing Palung Kiri & Kanan (Parallax Scroll ke Atas)
    const wallOffset = (camDepth * 1.4) % 90;
    dCtx.fillStyle = "rgba(2, 8, 20, 0.42)";
    dCtx.beginPath();
    dCtx.moveTo(0, 0);
    for (let y = -90; y <= H + 90; y += 45) {
      const wLeft = 14 + Math.sin((y + camDepth * 1.4) * 0.025) * 10;
      dCtx.lineTo(wLeft, y - wallOffset);
    }
    dCtx.lineTo(0, H);
    dCtx.closePath();
    dCtx.fill();

    dCtx.beginPath();
    dCtx.moveTo(W, 0);
    for (let y = -90; y <= H + 90; y += 45) {
      const wRight = W - (14 + Math.cos((y + camDepth * 1.4) * 0.025) * 10);
      dCtx.lineTo(wRight, y - wallOffset);
    }
    dCtx.lineTo(W, H);
    dCtx.closePath();
    dCtx.fill();

    // 4. Garis Pengukur Kedalaman (tiap 100m meluncur ke atas!)
    const pxPerMeter = 1.15;
    const minVisibleM = Math.floor((camDepth - H / (2 * pxPerMeter)) / 100) * 100;
    const maxVisibleM = Math.ceil((camDepth + H / (2 * pxPerMeter)) / 100) * 100;
    dCtx.font = "700 10px Outfit, sans-serif";
    dCtx.textAlign = "right";
    for (let m = Math.max(100, minVisibleM); m <= maxVisibleM; m += 100) {
      const screenY = H * 0.56 + (m - camDepth) * pxPerMeter;
      if (screenY > 12 && screenY < H - 12) {
        dCtx.strokeStyle =
          m === 350 || m === 650 || m === 890
            ? "rgba(250, 204, 21, 0.35)"
            : "rgba(148, 163, 184, 0.16)";
        dCtx.lineWidth = 1;
        dCtx.beginPath();
        dCtx.moveTo(26, screenY);
        dCtx.lineTo(W - 26, screenY);
        dCtx.stroke();

        dCtx.fillStyle = "rgba(226, 232, 240, 0.55)";
        dCtx.fillText(`${m}m`, W - 28, screenY - 4);
      }
    }

    // 5. Biota Laut yang Lewat Sesuai Kedalaman
    creatures.forEach((c) => {
      c.x += c.speedX;
      if (c.x < 32) c.x = W - 36;
      if (c.x > W - 32) c.x = 36;
      const cy = H * 0.56 + (c.depth - camDepth) * pxPerMeter;
      if (cy > -40 && cy < H + 40) {
        dCtx.save();
        if (c.glow || camDepth > 550) {
          dCtx.shadowColor = c.glow || "#38bdf8";
          dCtx.shadowBlur = 14;
        }
        dCtx.font = `${c.size}px sans-serif`;
        dCtx.textAlign = "center";
        dCtx.textBaseline = "middle";
        dCtx.fillText(c.emoji, c.x, cy);
        dCtx.restore();
      }
    });

    // 6. Partikel Gelembung & Cahaya Bioluminesensi Melesat ke Atas
    particles.forEach((p) => {
      p.y -= (1.5 + speedM * 2.4) * p.layer;
      if (p.y < -8) {
        p.y = H + 8;
        p.x = 20 + Math.random() * (W - 40);
      }
      dCtx.beginPath();
      dCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      dCtx.fillStyle =
        camDepth > 620
          ? `rgba(192, 132, 252, ${p.alpha})`
          : `rgba(186, 230, 253, ${p.alpha})`;
      dCtx.fill();
    });

    // 7. Render Semua Kapal Selam Pemain Menyelam Bersama!
    const count = results.length || 1;
    const sortedForDisplay = [...results];
    sortedForDisplay.forEach((res, idx) => {
      const targetD = res.depthGained || 0;
      const currentD = Math.round(Math.min(targetD, camDepth));
      res.currentDepth = currentD;

      const laneX =
        count === 1 ? W / 2 : 52 + (idx / (count - 1)) * (W - 104);
      // Kapal selam yang berhenti lebih dangkal tertinggal di atas kamera!
      const relY = H * 0.54 - (camDepth - currentD) * 0.82 + Math.sin(now * 0.006 + idx) * 3;
      if (relY > -60 && relY < H + 60) {
        drawSubmarine(laneX, relY, res, camDepth, res.playerId === myId, now);
      }
    });

    // 8. Update HUD Odometer & Zona (untuk penyelam kita sendiri)
    const myCurrentDepth = Math.round(Math.min(myTarget, camDepth));
    odometerEl.textContent = `+${formatMeters(myCurrentDepth)}`;
    const zone = getZoneLabelAtDepth(myCurrentDepth);
    zoneBadge.textContent = zone.text;
    zoneBadge.style.borderColor = zone.color;
    zoneBadge.style.color = zone.color;

    // 9. Efek Suara Gelembung & Ping Tiap Menembus Zona Baru
    if (now - lastBubbleTime > 170 && speedM > 1.5) {
      lastBubbleTime = now;
      playBubblePop(0.032);
    }
    if (myCurrentDepth >= 890 && lastTierSound < 3) {
      lastTierSound = 3;
      playSonarPing(1046.5, 0.25);
      triggerHaptic([40, 30, 80]);
    } else if (myCurrentDepth >= 650 && lastTierSound < 2) {
      lastTierSound = 2;
      playSonarPing(783.99, 0.2);
      triggerHaptic(35);
    } else if (myCurrentDepth >= 350 && lastTierSound < 1) {
      lastTierSound = 1;
      playSonarPing(659.25, 0.16);
    }

    if (rawProgress < 1) {
      descendRafId = requestAnimationFrame(frame);
    } else {
      setTimeout(() => {
        if (descendFinishCallback) {
          const cb = descendFinishCallback;
          stopDescendAnimation();
          cb();
        }
      }, 480);
    }
  }

  descendRafId = requestAnimationFrame(frame);
}

// ============================================================================
// FASE REVEAL HASIL RONDE & FAKTA EDUKATIF
// ============================================================================
function handleRoundRevealUI(payload) {
  setBgmMood("calm");
  const revealReceivedAt = Date.now();
  const totalWaitMs = payload.nextRoundInMs || 13500;

  // Jalankan countdown di background supaya timer akurat meski user menonton animasi descend
  const timerEl = document.getElementById("reveal-next-timer");
  const updateCountdownLabel = () => {
    const rem = Math.max(0, Math.ceil((totalWaitMs - (Date.now() - revealReceivedAt)) / 1000));
    timerEl.textContent = rem;
    if (rem <= 0 && revealCountdownInterval) {
      clearInterval(revealCountdownInterval);
      revealCountdownInterval = null;
    }
  };
  updateCountdownLabel();
  revealCountdownInterval = setInterval(updateCountdownLabel, 500);

  // Tampilkan Animasi Group Descend ala Krillion.io terlebih dahulu!
  playGroupDescendAnimation(payload, () => {
    document.getElementById("phase-playing").classList.add("hidden");
    document.getElementById("phase-descend").classList.add("hidden");
    document.getElementById("phase-reveal").classList.remove("hidden");

    document.getElementById("reveal-round-num").textContent = `${payload.round}/${payload.roundsTotal}`;
    document.getElementById("reveal-category-title").textContent = payload.categoryTitle;

    const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
    const myResult = payload.results.find((r) => r.playerId === myId) || payload.results[0];
    if (myResult) {
      playRevealFanfare(myResult.tier.id, myResult.isCollision);
      triggerSonarRipple(myResult.tier.color || "rgba(56, 189, 248, 0.5)");
    }

    const listEl = document.getElementById("reveal-results-list");
    listEl.innerHTML = payload.results
      .map(
        (r) => `
      <div class="reveal-row" style="border-left-color: ${r.tier.color}">
        <div class="reveal-player-col">
          <span style="font-size:1.55rem;">${r.playerAvatar}</span>
          <div>
            <strong>${escapeHtml(r.playerName)}</strong>
            <div style="font-size:0.74rem;color:#94a3b8;">Total: ${formatMeters(r.totalDepth)}</div>
          </div>
        </div>

        <div class="reveal-answer-col">
          <div class="reveal-answer-word">${escapeHtml(r.canonicalName)}</div>
          <div class="reveal-badges">
            <span class="r-badge" style="background:${r.tier.color}22;color:${r.tier.color};border:1px solid ${r.tier.color}66;">
              ${r.tier.emoji} ${r.tier.name}
            </span>
            ${
              r.isCollision
                ? `<span class="r-badge badge-collision">💥 TABRAKAN (${r.collisionWithCount} Kapal Sama! -50%)</span>`
                : ""
            }
            ${
              r.isSoleExplorer
                ? `<span class="r-badge badge-sole">🌟 PENEMU TUNGGAL (+150m Bonus!)</span>`
                : ""
            }
          </div>
        </div>

        <div class="reveal-score-col">
          <div class="depth-gain-big" style="color:${r.tier.color}">+${formatMeters(r.depthGained)}</div>
          <small style="color:#94a3b8;font-size:0.72rem;">Skor Kelangkaan: ${r.baseScore}/100</small>
        </div>
      </div>
    `
      )
      .join("");

    if (payload.rarestGuessed) {
      document.getElementById("spotlight-answer-title").textContent = `${payload.rarestGuessed.tier.emoji} ${payload.rarestGuessed.canonicalName} (Ditemukan oleh ${payload.rarestGuessed.finderName})`;
      document.getElementById("spotlight-answer-fact").textContent =
        payload.rarestGuessed.fact || payload.educationalNote;
    } else {
      document.getElementById("spotlight-answer-title").textContent = "💡 Catatan Wawasan Kategori Ini";
      document.getElementById("spotlight-answer-fact").textContent = payload.educationalNote;
    }

    const legContainer = document.getElementById("reveal-legendary-list");
    legContainer.innerHTML = (payload.legendaryExamples || [])
      .map(
        (ex) => `
      <div class="leg-item">
        <strong>🟡 ${escapeHtml(ex.name)} (+${formatMeters(ex.depthMeters)})</strong> — ${escapeHtml(ex.fact)}
      </div>
    `
      )
      .join("");
  });
}

if (socket) {
  socket.on("round:reveal", (payload) => {
    clearClientTimers();
    handleRoundRevealUI(payload);
  });
}

// ============================================================================
// LAYAR GAME OVER & KARTU HASIL SELAM (SHAREABLE CARD & WHATSAPP)
// ============================================================================
function handleGameOverUI(payload) {
  showScreen("gameover");
  playRevealFanfare("LEGENDA", false);

  const isCoop = payload.gameMode === "coop";
  document.getElementById("gameover-mode-badge").textContent = payload.isDaily
    ? `🏆 TANTANGAN HARIAN #${payload.dateKey}`
    : isCoop
    ? "🤝 EKSPEDISI TIM CO-OP SELESAI!"
    : payload.gameMode === "tide"
    ? "🌊 ARUS PASANG SELESAI!"
    : "🏁 PERTANDINGAN SELESAI!";

  if (isCoop) {
    document.getElementById("gameover-headline").textContent = `Total Kedalaman Tim: ${formatMeters(payload.teamTotalDepth)}!`;
  } else {
    const winner = payload.standings[0];
    document.getElementById("gameover-headline").textContent = winner
      ? `${winner.avatar} ${winner.name} Menjuarai Palung (${formatMeters(winner.totalDepth)})!`
      : "Ekspedisi Selesai!";
  }

  const podiumEl = document.getElementById("gameover-podium");
  podiumEl.innerHTML = payload.standings
    .map(
      (p, idx) => `
      <div class="podium-card ${idx === 0 ? "rank-1" : ""}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.5rem;">
          <span style="font-weight:900;color:${idx === 0 ? "#facc15" : "#38bdf8"};">PERINGKAT #${idx + 1}</span>
          <span style="font-family:var(--font-heading);font-weight:900;font-size:1.25rem;">${formatMeters(p.totalDepth)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.65rem;">
          <span style="font-size:1.85rem;">${p.avatar}</span>
          <div>
            <strong style="font-size:1.05rem;">${escapeHtml(p.name)}</strong>
            <div style="font-size:0.85rem;margin-top:2px;">${(p.historyTiers || []).join(" ")}</div>
          </div>
        </div>
        ${
          p.bestAnswer
            ? `<div style="font-size:0.78rem;background:rgba(4,13,26,0.75);padding:0.55rem;border-radius:10px;color:#cbd5e1;">
                💎 <strong>Temuan Terbaik:</strong> ${escapeHtml(p.bestAnswer.answerName)} (+${formatMeters(p.bestAnswer.depthGained)})
              </div>`
            : ""
        }
      </div>
    `
    )
    .join("");

  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
  const me = payload.standings.find((p) => p.id === myId) || payload.standings[0];
  if (me) {
    const shareLines = [
      `🌊 PALUNG.IO — ${payload.isDaily ? `Daily Dive #${payload.dateKey}` : "Selam Wawasan"}`,
      `${me.avatar} Penyelam: ${me.name}`,
      `⚓ Kedalaman Akhir: ${formatMeters(me.totalDepth)}`,
      `📊 Jejak Selam: ${(me.historyTiers || []).join("")}`,
      me.bestAnswer
        ? `💎 Temuan Terlangka: ${me.bestAnswer.answerName} (+${formatMeters(me.bestAnswer.depthGained)})`
        : `💎 Siap menyelam lebih dalam!`,
      `Adu wawasan langka di PALUNG.IO!`
    ];
    document.getElementById("share-text-box").textContent = shareLines.join("\n");
  }
}

if (socket) {
  socket.on("game:over", (payload) => {
    clearClientTimers();
    handleGameOverUI(payload);
  });
}

document.getElementById("btn-copy-share").addEventListener("click", () => {
  const text = document.getElementById("share-text-box").textContent;
  navigator.clipboard.writeText(text);
  playDiveLock();
  showToast("📋 Kartu Hasil Selam berhasil disalin!");
});

document.getElementById("btn-share-wa").addEventListener("click", () => {
  const text = document.getElementById("share-text-box").textContent;
  if (navigator.share) {
    navigator.share({ title: "Rekor Selam PALUNG.IO", text }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }
});

document.getElementById("btn-play-again").addEventListener("click", () => {
  playDiveLock();
  if (isLocalOfflineGame) {
    startLocalOfflineMatch({ isDaily: currentRoom && currentRoom.isDaily });
    return;
  }
  if (socket) socket.emit("game:start");
});

document.getElementById("btn-gameover-lobby").addEventListener("click", () => {
  if (isLocalOfflineGame) {
    showScreen("home");
    return;
  }
  if (socket) socket.emit("game:backToLobby");
});

document.getElementById("btn-gameover-home").addEventListener("click", () => {
  if (socket && !isLocalOfflineGame) socket.emit("room:leave");
  currentRoom = null;
  isLocalOfflineGame = false;
  showScreen("home");
  loadHomeInfo();
});

// ============================================================================
// UPDATE ROOM & REAKSI GELEMBUNG EMOJI REAL-TIME
// ============================================================================
if (socket) {
  socket.on("room:update", (room) => {
    currentRoom = room;
    if (room.state === "LOBBY") {
      renderLobby(room);
      showScreen("lobby");
    } else if (room.state === "PLAYING" || room.state === "REVEAL") {
      renderGameScreen(room);
    }
  });

  socket.on("room:reaction", ({ playerAvatar, playerName, emoji }) => {
    spawnFloatingReaction(playerAvatar, playerName, emoji);
  });
}

function spawnFloatingReaction(playerAvatar, playerName, emoji) {
  const container = document.getElementById("floating-reactions");
  const el = document.createElement("div");
  el.className = "reaction-bubble";
  el.innerHTML = `<span>${playerAvatar}</span> <strong>${escapeHtml(playerName)}:</strong> <span style="font-size:1.25rem">${escapeHtml(emoji || "🌊")}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2600);
}

document.querySelectorAll(".react-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const emoji = btn.dataset.emoji;
    playSonarPing(880, 0.07);
    triggerHaptic(20);
    if (isLocalOfflineGame) {
      const { name, avatar } = getIdentity();
      spawnFloatingReaction(avatar, name, emoji);
    } else if (socket) {
      socket.emit("room:reaction", { emoji });
    }
  });
});

// ============================================================================
// WORKSHOP KATEGORI KUSTOM KOMUNITAS (ONLINE + LOCALSTORAGE OFFLINE)
// ============================================================================
const modalWorkshop = document.getElementById("modal-workshop");

document.getElementById("btn-open-workshop").addEventListener("click", () => {
  modalWorkshop.classList.remove("hidden");
});

document.getElementById("btn-close-workshop").addEventListener("click", () => {
  modalWorkshop.classList.add("hidden");
});

document.getElementById("btn-cancel-workshop").addEventListener("click", () => {
  modalWorkshop.classList.add("hidden");
});

document.getElementById("form-workshop").addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("ws-title").value.trim();
  const theme = document.getElementById("ws-theme").value;
  const hint = document.getElementById("ws-hint").value.trim();
  const rawLines = document.getElementById("ws-answers").value.split("\n");

  const answers = [];
  rawLines.forEach((line) => {
    const parts = line.split("|").map((s) => s.trim());
    if (parts[0]) {
      answers.push({
        name: parts[0],
        score: Number(parts[1]) || 50,
        fact: parts[2] || "Jawaban kategori komunitas Palung.io!"
      });
    }
  });

  if (answers.length < 4) {
    showToast("⚠️ Masukkan minimal 4 baris jawaban!");
    return;
  }

  // Simpan juga ke LocalStorage agar tersedia saat Offline di HP!
  const localCustom = JSON.parse(localStorage.getItem("palung_custom_cats") || "[]");
  localCustom.push({
    id: "local-" + Date.now(),
    title,
    theme,
    hint: hint || "Kategori kreasi komunitas Palung.io!",
    educationalNote: "Kategori kreasi pemain Palung.io.",
    answers
  });
  localStorage.setItem("palung_custom_cats", JSON.stringify(localCustom));

  try {
    await fetch(`${apiBaseUrl}/api/categories/custom`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, theme, hint, answers })
    });
  } catch (err) {}

  playDiveLock();
  modalWorkshop.classList.add("hidden");
  document.getElementById("form-workshop").reset();
  showToast(`✅ Kategori "${title}" berhasil disimpan ke Server & Memori HP!`);
  loadHomeInfo();
});

// ============================================================================
// HELPER FORMAT
// ============================================================================
function formatMeters(m) {
  return Number(m || 0).toLocaleString("id-ID") + "m";
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// DETEKSI KEYBOARD HP (SEMBUNYIKAN BOTTOM NAV & POSISIKAN INPUT DENGAN NYAMAN)
// ============================================================================
document.addEventListener("focusin", (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") {
    document.body.classList.add("keyboard-open");
    setTimeout(() => {
      try {
        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch (err) {}
    }, 180);
  }
});

document.addEventListener("focusout", () => {
  setTimeout(() => {
    const activeTag = document.activeElement && document.activeElement.tagName;
    if (activeTag !== "INPUT" && activeTag !== "TEXTAREA") {
      document.body.classList.remove("keyboard-open");
    }
  }, 120);
});

if (window.visualViewport) {
  const initialHeight = window.innerHeight;
  window.visualViewport.addEventListener("resize", () => {
    const isShrunk = window.visualViewport.height < initialHeight * 0.78;
    document.body.classList.toggle("keyboard-open", isShrunk);
  });
}


// ============================================================================
// OKSIGEN & SONAR PING (khas PALUNG.IO, hanya mode online)
// ============================================================================
function updateOxygenHud(room) {
  const hud = document.getElementById("oxygen-hud");
  if (!hud) return;
  const myHudId = isLocalOfflineGame ? "me" : socket ? socket.id : null;
  const me = myHudId && room && room.players ? room.players.find((p) => p.id === myHudId) : null;
  if (!me || typeof me.oxygen !== "number") {
    hud.classList.add("hidden");
    return;
  }
  if (room.settings && room.settings.gameMode === "tide") {
    hud.classList.add("hidden");
    return;
  }
  hud.classList.remove("hidden");
  const bar = document.getElementById("oxygen-bar");
  bar.style.width = me.oxygen + "%";
  bar.classList.toggle("low", me.oxygen <= 40 && me.oxygen > 15);
  bar.classList.toggle("critical", me.oxygen <= 15);
  document.getElementById("oxygen-value").textContent = me.oxygen + "%";
  document.getElementById("sonar-ping-count").textContent = me.sonarPings;
  document.getElementById("btn-sonar-ping").disabled = me.sonarPings <= 0 || me.oxygen < 15 || room.state !== "PLAYING" || me.readyInRound;
}

if (socket) {
  socket.on("room:update", (room) => updateOxygenHud(room));
  socket.on("round:start", () => {
    const r = document.getElementById("sonar-ping-result");
    if (r) r.textContent = "";
  });
  socket.on("round:reveal", (payload) => {
    const mine = (payload.results || []).find((r) => r.playerId === socket.id);
    if (mine && !(currentRoom && currentRoom.settings && currentRoom.settings.gameMode === "tide")) showOxygenToast(mine);
  });
}

function showOxygenToast(mine) {
  if (typeof mine.oxygenDelta !== "number") return;
  const sign = mine.oxygenDelta > 0 ? "+" : "";
  let msg = `🫧 Oksigen ${sign}${mine.oxygenDelta}% (sisa ${mine.oxygenAfter}%)`;
  if (mine.suffocating) msg = "😮‍💨 Sesak napas! Hasil selam −30%. " + msg;
  showToast(msg);
}

// Sinkronkan HUD dengan render layar (mode offline tidak memakai event room:update)
const _origRenderGameScreen = renderGameScreen;
renderGameScreen = function (room) {
  _origRenderGameScreen(room);
  updateOxygenHud(room);
};
const _origHandleRoundStartUI = handleRoundStartUI;
handleRoundStartUI = function (payload) {
  _origHandleRoundStartUI(payload);
  const r = document.getElementById("sonar-ping-result");
  if (r) r.textContent = "";
  const inp = document.getElementById("input-answer");
  const tide = currentRoom && currentRoom.settings && currentRoom.settings.gameMode === "tide";
  if (inp) inp.placeholder = tide ? "Ketik jawaban yang paling umum dipilih..." : "Ketik jawaban paling langka...";
};

function showSonarResult(res) {
  if (!res || !res.success) {
    showToast(res ? res.message : "Sonar Ping tidak tersedia.");
    return;
  }
  playSonarPing(880, 0.25);
  triggerSonarRipple("rgba(56, 189, 248, 0.6)");
  triggerHaptic(40);
  document.getElementById("sonar-ping-result").textContent =
    `📡 Ada jawaban ${res.tierName} berawalan "${res.firstLetter}" (${res.letters} huruf, ${res.words} kata)`;
}

document.getElementById("btn-sonar-ping").addEventListener("click", () => {
  if (isLocalOfflineGame) {
    const me = currentRoom.players.find((p) => p.id === "me");
    const cat = currentRoom.selectedCategories[currentRoom.currentRound - 1];
    if (!me || !cat || currentRoom.state !== "PLAYING") return;
    if (me.readyInRound) return showSonarResult({ success: false, message: "Jawabanmu sudah terkunci." });
    if (me.sonarUsedRound === currentRoom.currentRound) return showSonarResult({ success: false, message: "Sonar Ping hanya 1x per ronde." });
    if (me.sonarPings <= 0) return showSonarResult({ success: false, message: "Sonar Ping sudah habis." });
    if (me.oxygen < 15) return showSonarResult({ success: false, message: "Oksigen tidak cukup untuk Sonar Ping." });
    const rare = cat.answers.filter((a) => a.score >= 65);
    const pool = rare.length ? rare : [...cat.answers].sort((a, b) => b.score - a.score).slice(0, 3);
    const target = pool[Math.floor(Math.random() * pool.length)];
    const name = String(target.name).trim();
    me.sonarPings -= 1;
    me.sonarUsedRound = currentRoom.currentRound;
    me.oxygen = Math.max(0, me.oxygen - 15);
    renderGameScreen(currentRoom);
    showSonarResult({
      success: true,
      firstLetter: name.charAt(0).toUpperCase(),
      letters: name.replace(/[^\p{L}\p{N}]/gu, "").length,
      words: name.split(/\s+/).length,
      tierName: getTierInfo(target.score).name
    });
    return;
  }
  if (!socket) return;
  socket.emit("round:sonar", showSonarResult);
});
