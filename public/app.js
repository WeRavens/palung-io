// ============================================================================
// PALUNG.IO — Hybrid Mobile & Web Client Engine
// Mendukung: Real-Time Socket.IO Multiplayer + 100% On-Device Offline Engine
// (Siap untuk Google Play Store Capacitor APK & Installable PWA)
// ============================================================================

const isCapacitorNative =
  window.location.protocol === "capacitor:" ||
  (window.location.hostname === "localhost" && window.location.port !== "3000");

const apiBaseUrl = isCapacitorNative
  ? localStorage.getItem("palung_server_url") || window.PALUNG_DEFAULT_SERVER || "https://palung-io.onrender.com"
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
  document.body.classList.toggle("in-gameplay", screenName === "game");
  if (screenName !== "game" && typeof setBgmMood === "function") {
    setBgmMood("calm");
  }
  if (screenName !== "gameover" && typeof stopGameOverConfetti === "function") {
    stopGameOverConfetti();
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

document.getElementById("btn-sound-toggle").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  document.getElementById("btn-sound-toggle").textContent = soundEnabled ? "🎵🔊" : "🔇";
  const hudSound = document.getElementById("btn-hud-sound");
  if (hudSound) hudSound.textContent = soundEnabled ? "🔊" : "🔇";
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

const btnHudSound = document.getElementById("btn-hud-sound");
if (btnHudSound) {
  btnHudSound.addEventListener("click", () => {
    document.getElementById("btn-sound-toggle").click();
  });
}

const btnHudMenu = document.getElementById("btn-hud-menu");
if (btnHudMenu) {
  btnHudMenu.addEventListener("click", () => {
    document.getElementById("btn-home-logo").click();
  });
}

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

function isActiveMultiplayerMatch() {
  return Boolean(
    currentRoom &&
      !isLocalOfflineGame &&
      (currentRoom.state === "PLAYING" || currentRoom.state === "REVEAL") &&
      currentRoom.players &&
      currentRoom.players.filter((p) => !p.isBot).length > 1
  );
}

document.querySelectorAll(".mnav-item").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (isActiveMultiplayerMatch()) {
      playErrorBuzz();
      showToast("⚠️ Tidak bisa keluar atau buka menu lain saat pertandingan berlangsung!");
      return;
    }
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
    if (isCollision) {
      depthGained = Math.round(depthGained * 0.5);
      p.collisionsCount = (p.collisionsCount || 0) + 1;
    }
    if (isSoleExplorer) {
      depthGained += 150;
      p.uniqueBonusCount = (p.uniqueBonusCount || 0) + 1;
    }

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

  const revealPayload = {
    round: currentRoom.currentRound,
    roundsTotal: currentRoom.roundsTotal,
    categoryTitle: cat.title,
    educationalNote: cat.educationalNote,
    results,
    rarestGuessed,
    legendaryExamples,
    nextRoundInMs: 13000
  };
  currentRoom.roundHistory.push(revealPayload);

  renderGameScreen(currentRoom);
  handleRoundRevealUI(revealPayload);

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
    teamTotalDepth: standings.reduce((s, p) => s + p.totalDepth, 0),
    roundHistory: currentRoom.roundHistory
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

const BIO_COLORS = [
  "125, 211, 252", // sonar cyan
  "52, 211, 153",  // bioluminescent teal
  "167, 139, 250"  // abyssal violet
];

for (let i = 0; i < 48; i++) {
  const isBio = i % 3 === 0;
  bubbles.push({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    r: isBio ? 1.4 + Math.random() * 2.6 : 1.5 + Math.random() * 4.2,
    speed: (isBio ? 0.2 : 0.35) + Math.random() * 0.85,
    alpha: (isBio ? 0.22 : 0.1) + Math.random() * 0.32,
    isBio,
    colorRgb: isBio ? BIO_COLORS[i % BIO_COLORS.length] : "125, 211, 252",
    phase: Math.random() * Math.PI * 2
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

function drawAbyssalSilhouetteLayer(t, baseYRatio, amp, freq, fillStyle) {
  const w = canvas.width;
  const h = canvas.height;
  const baseY = h * baseYRatio;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, baseY);
  const step = Math.max(24, Math.floor(w / 24));
  for (let x = 0; x <= w + step; x += step) {
    const y =
      baseY +
      Math.sin(x * freq + t) * amp +
      Math.cos(x * freq * 0.55 - t * 0.7) * (amp * 0.55);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

let oceanTick = 0;
function animateOcean() {
  oceanTick += 0.012;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Ambient Sonar HUD Sweep (lingkaran radar halus di tengah layar)
  const cx = canvas.width / 2;
  const cy = canvas.height * 0.46;
  const maxRadar = Math.min(canvas.width, canvas.height) * 0.42;
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.045)";
  ctx.lineWidth = 1;
  for (let ring = 1; ring <= 3; ring++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (maxRadar * ring) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  // Layered Abyssal Silhouettes (siluet palung laut dalam berlapis)
  drawAbyssalSilhouetteLayer(oceanTick * 0.6, 0.78, 22, 0.0045, "rgba(7, 24, 48, 0.42)");
  drawAbyssalSilhouetteLayer(oceanTick * 0.9 + 1.4, 0.86, 18, 0.006, "rgba(3, 13, 29, 0.68)");

  bubbles.forEach((b) => {
    b.y -= b.speed;
    b.x += Math.sin(b.y * 0.02 + b.phase) * 0.35;
    if (b.y < -10) {
      b.y = canvas.height + 10;
      b.x = Math.random() * canvas.width;
    }
    const pulse = b.isBio ? 0.65 + 0.35 * Math.sin(oceanTick * 3 + b.phase) : 1;
    if (b.isBio) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${b.colorRgb}, ${b.alpha * 0.22 * pulse})`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${b.colorRgb}, ${b.alpha * pulse})`;
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

function getClientId() {
  let cid = localStorage.getItem("palung_client_id");
  if (!cid) {
    cid = "cid_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("palung_client_id", cid);
  }
  return cid;
}

if (socket) {
  socket.on("connect", () => {
    document.getElementById("conn-text").textContent = "Server Online";
    document.getElementById("conn-dot").style.background = "#10b981";
    socket.emit("session:reconnect", { clientId: getClientId() }, (res) => {
      if (res && res.success && res.room) {
        currentRoom = res.room;
        isLocalOfflineGame = false;
        showToast("🔄 Tersambung kembali ke permainan!");
        if (res.room.state === "PLAYING" && res.roundData) {
          handleRoundStartUI(res.roundData);
          if (res.roundData.alreadySubmitted) {
            lockAnswerUI("Terkirim", "Menunggu", 0);
          }
        } else if (res.room.state === "REVEAL") {
          showScreen("reveal");
        } else if (res.room.state === "LOBBY") {
          renderLobby(currentRoom);
          showScreen("lobby");
        }
      }
    });
  });
  socket.on("room:leave:blocked", ({ message }) => {
    showToast(message || "Tidak bisa keluar saat permainan multiplayer sedang berlangsung!");
  });
  socket.on("disconnect", () => {
    document.getElementById("conn-text").textContent = "Mode Mandiri";
    document.getElementById("conn-dot").style.background = "#38bdf8";
  });
  socket.on("public:rooms:update", (publicRooms) => {
    const prContainer = document.getElementById("public-rooms-list");
    if (!prContainer) return;
    if (!publicRooms || publicRooms.length === 0) {
      prContainer.innerHTML = `<div class="empty-state">Belum ada room publik di lobby. Klik <strong>Arena Cepat</strong> atau <strong>Buat Room Party</strong>!</div>`;
      return;
    }
    prContainer.innerHTML = publicRooms
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
  socket.emit("room:quickmatch", { name, avatar, theme: "all", clientId: getClientId() }, (res) => {
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
  socket.emit("room:create", { name, avatar, isPublic: true, clientId: getClientId() }, (res) => {
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
  socket.emit("room:join", { code, name, avatar, clientId: getClientId() }, (res) => {
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
  if (isActiveMultiplayerMatch()) {
    playErrorBuzz();
    showToast("⚠️ Tidak bisa keluar saat pertandingan multiplayer sedang berlangsung!");
    return;
  }
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
  const mePlayer = room.players.find((p) => p.id === myId);
  const playersContainer = document.getElementById("lobby-players-list");

  // Hanya Host yang bisa tekan Mulai; Guest hanya bisa tekan Siap/Ready!
  const btnStart = document.getElementById("btn-start-game");
  const btnReady = document.getElementById("btn-lobby-ready");
  if (btnStart) btnStart.classList.toggle("hidden", !isHost);
  if (btnReady) {
    btnReady.classList.toggle("hidden", isHost);
    const isReady = mePlayer && mePlayer.lobbyReady;
    btnReady.textContent = isReady ? "✅ SUDAH SIAP! (Batal)" : "✋ SIAP MENYELAM!";
    btnReady.style.background = isReady
      ? "linear-gradient(135deg,#10b981,#059669)"
      : "linear-gradient(135deg,#0284c7,#0ea5e9)";
  }

  playersContainer.innerHTML = room.players
    .map(
      (p) => `
      <div class="player-lobby-card" style="border-color: ${p.color}55">
        <div class="p-info">
          <span class="p-avatar">${p.avatar}</span>
          <div>
            <span class="p-name">${escapeHtml(p.name)} ${p.id === myId ? "(Kamu)" : ""}</span>
            <span class="p-tag">${
              p.isBot
                ? "🤖 AI Bot Siap"
                : p.id === room.hostId
                ? "👑 Kapten Host"
                : p.lobbyReady
                ? "✅ Siap Menyelam"
                : "⏳ Menunggu Siap"
            }</span>
          </div>
        </div>
        ${
          p.isBot && isHost
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

const btnLobbyReady = document.getElementById("btn-lobby-ready");
if (btnLobbyReady) {
  btnLobbyReady.addEventListener("click", () => {
    playSonarPing(880, 0.12);
    triggerHaptic(25);
    if (socket) socket.emit("lobby:toggleReady");
  });
}

const formLobbyChat = document.getElementById("form-lobby-chat");
if (formLobbyChat) {
  formLobbyChat.addEventListener("submit", (e) => {
    e.preventDefault();
    const inp = document.getElementById("input-lobby-chat");
    const text = inp.value.trim();
    if (!text || !socket) return;
    socket.emit("lobby:chat", { text });
    inp.value = "";
  });
}

if (socket) {
  socket.on("lobby:chat", ({ playerAvatar, playerName, text }) => {
    const box = document.getElementById("lobby-chat-messages");
    if (!box) return;
    const row = document.createElement("div");
    row.className = "lobby-chat-msg";
    row.innerHTML = `<span>${playerAvatar || "🤿"}</span> <strong>${escapeHtml(playerName)}:</strong> ${escapeHtml(text)}`;
    box.appendChild(row);
    box.scrollTop = box.scrollHeight;
  });

  socket.on("room:disbanded", ({ reason }) => {
    currentRoom = null;
    clearClientTimers();
    showScreen("home");
    loadHomeInfo();
    showToast(`⏰ ${reason || "Room telah dibubarkan."}`);
  });
}

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

function updateCrewDrawerAndHud(room) {
  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
  const sorted = [...room.players].sort((a, b) => b.totalDepth - a.totalDepth);

  const sideList = document.getElementById("game-sidebar-players");
  if (sideList) {
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
  }

  const crewCountEl = document.getElementById("hud-crew-count");
  if (crewCountEl) crewCountEl.textContent = room.players.length;

  const myPlayer = room.players.find((p) => p.id === myId) || room.players[0];
  if (myPlayer) {
    updateAmbientDepthZone(myPlayer.totalDepth);
    const hudDepth = document.getElementById("hud-my-depth");
    if (hudDepth) hudDepth.textContent = formatMeters(myPlayer.totalDepth);

    const hudOxy = document.getElementById("hud-my-oxygen");
    if (hudOxy) {
      hudOxy.textContent =
        typeof myPlayer.oxygen === "number" ? `${myPlayer.oxygen}%` : `${myPlayer.historyTiers.length * 100}`;
    }

    if (typeof oceanWorld !== "undefined" && !oceanWorld.diveActive) {
      oceanWorld.targetCameraDepth = myPlayer.totalDepth;
    }
  }

  // Update 7 Kotak Progres Ronde di Tengah Atas HUD
  const pipsWrap = document.getElementById("hud-progress-pips");
  if (pipsWrap) {
    const total = room.roundsTotal || 7;
    const cur = room.currentRound || 1;
    const tiers = (myPlayer && myPlayer.historyTiers) || [];
    let html = "";
    for (let i = 1; i <= total; i++) {
      let cls = "pip";
      const tEmoji = tiers[i - 1];
      if (tEmoji === "🟡") cls += " done-legenda";
      else if (tEmoji === "🟣") cls += " done-abisal";
      else if (tEmoji === "🔵") cls += " done-karang";
      else if (tEmoji === "🟢") cls += " done-plankton";
      else if (tEmoji === "💥") cls += " done-collision";
      else if (tEmoji === "⚫") cls += " done-missed";
      else if (i === cur) cls += " active";
      html += `<span class="${cls}"></span>`;
    }
    pipsWrap.innerHTML = html;
  }
}

function renderSubmarineTrench(room) {
  updateCrewDrawerAndHud(room);
}

// Toggle Popover Daftar Kru
const btnToggleCrew = document.getElementById("btn-toggle-crew-drawer");
const crewDrawerPopover = document.getElementById("crew-drawer-popover");
const btnCloseCrew = document.getElementById("btn-close-crew-drawer");
if (btnToggleCrew && crewDrawerPopover) {
  btnToggleCrew.addEventListener("click", () => {
    crewDrawerPopover.classList.toggle("hidden");
  });
}
if (btnCloseCrew && crewDrawerPopover) {
  btnCloseCrew.addEventListener("click", () => {
    crewDrawerPopover.classList.add("hidden");
  });
}

function renderGameScreen(room) {
  document.getElementById("game-round-indicator").textContent = `RONDE ${room.currentRound} DARI ${room.roundsTotal}`;
  const roomTitleEl = document.getElementById("trench-room-title");
  if (roomTitleEl) {
    roomTitleEl.textContent = room.isDaily
      ? "Tantangan Harian"
      : isLocalOfflineGame
      ? "Mode Mandiri HP"
      : room.settings.gameMode === "coop"
      ? "Tim Co-op"
      : `Kru Room ${room.code}`;
  }

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
    document.getElementById("game-category-count").textContent = `📡 ${room.category.totalPossibleAnswers}+ Jawaban`;
    document.getElementById("game-category-title").textContent = room.category.title;
    document.getElementById("game-category-hint").textContent = room.category.hint;
  }
}

function handleRoundStartUI(payload) {
  showScreen("game");
  setBgmMood("diving");
  triggerSonarRipple("rgba(56, 189, 248, 0.5)");
  playSonarPing(784, 0.2);

  if (payload.round === 1 && typeof oceanWorld !== "undefined") {
    oceanWorld.cameraDepth = 0;
    oceanWorld.targetCameraDepth = 0;
    oceanWorld.diveActive = false;
  }
  if (typeof oceanWorld !== "undefined") {
    oceanWorld.showRevealTags = false;
  }
  const revDrawer = document.getElementById("reveal-detail-drawer");
  if (revDrawer) revDrawer.classList.add("hidden");
  if (typeof ensurePersistentOceanRunning === "function") {
    ensurePersistentOceanRunning();
  }

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
    oceanWorld.rarestBanner = null;
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
  feedback.textContent = "";
  feedback.className = "sonar-feedback";

  const phasePlaying = document.getElementById("phase-playing");
  if (phasePlaying) phasePlaying.classList.remove("keyboard-typing");

  document.getElementById("form-answer").classList.add("hidden");
  const lockedPanel = document.getElementById("locked-answer-panel");
  lockedPanel.classList.remove("hidden");
  lockedPanel.classList.add("simple-check-dock");
  const badge = lockedPanel.querySelector(".locked-badge");
  if (badge) badge.textContent = "✓";
  document.getElementById("locked-answer-name").textContent = canonicalName;

  const btnReroll = document.getElementById("btn-use-reroll");
  document.getElementById("reroll-count").textContent = rerollsLeft;
  btnReroll.disabled = rerollsLeft <= 0;
  if (rerollsLeft <= 0) btnReroll.classList.add("hidden");
  else btnReroll.classList.remove("hidden");
}

// Soal ikut turun simpel saat mengetik di mobile / fokus input
const inputAnswerEl = document.getElementById("input-answer");
if (inputAnswerEl) {
  let blurTimer = null;
  inputAnswerEl.addEventListener("focus", () => {
    if (blurTimer) clearTimeout(blurTimer);
    const phasePlaying = document.getElementById("phase-playing");
    if (phasePlaying) phasePlaying.classList.add("keyboard-typing");
  });
  inputAnswerEl.addEventListener("blur", () => {
    blurTimer = setTimeout(() => {
      const phasePlaying = document.getElementById("phase-playing");
      if (phasePlaying) phasePlaying.classList.remove("keyboard-typing");
    }, 120);
  });
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
// CONTINUOUS PERSISTENT OCEAN WORLD (ALA KRILLION.IO — SELALU HIDUP DI LAYAR)
// ============================================================================
const AMBIENT_OCEAN_FACTS = [
  "-- cahaya matahari hanya mampu menembus hingga kedalaman ~200m --",
  "-- ubur-ubur bioluminesensi bersinar alami di zona tengah malam --",
  "-- paus sperma menyelam hingga 2.000m untuk berburu cumi-cumi raksasa --",
  "-- tekanan di Palung Mariana setara dengan 50 pesawat jet menindihmu --",
  "-- hampir 80% dasar samudra Bumi belum pernah dipetakan manusia --",
  "-- lubang hidrotermal dasar laut memanaskan air hingga 400°C tanpa mendidih --",
  "-- ikan raja laut Coelacanth hidup tenang di perairan dalam Sulawesi --"
];

const OCEAN_MILESTONES = [
  { depth: 200, label: "🌊 BATAS ZONA SENJA · 200m", color: "#38bdf8" },
  { depth: 500, label: "🔵 TERUMBU DALAM · 500m", color: "#38bdf8" },
  { depth: 1000, label: "🌑 ZONA TENGAH MALAM · 1.000m", color: "#818cf8" },
  { depth: 1500, label: "🦑 WILAYAH CUMI RAKSASA · 1.500m", color: "#c084fc" },
  { depth: 2500, label: "🟣 ZONA ABISAL · 2.500m", color: "#c084fc" },
  { depth: 4000, label: "🌋 VENTILASI HIDROTERMAL · 4.000m", color: "#f59e0b" },
  { depth: 5500, label: "🟡 PALUNG HADAL · 5.500m", color: "#facc15" },
  { depth: 7000, label: "🏆 DASAR PALUNG MARIANA · 7.000m", color: "#facc15" }
];

const oceanWorld = {
  rafId: null,
  cameraDepth: 0,
  targetCameraDepth: 0,
  diveActive: false,
  showRevealTags: false,
  diveStartTime: 0,
  diveDurationMs: 4000,
  diveFromDepth: 0,
  diveToDepth: 0,
  diveMaxPlayerDepth: 0,
  diveResults: [],
  diveMyId: "me",
  diveOnDone: null,
  diveFinishTimer: null,
  lastTierSound: 0,
  lastBubbleTime: 0,
  creatures: Array.from({ length: 48 }, (_, i) => {
    const bank = [
      { minD: 20, maxD: 900, emoji: "🐠", size: 20, speed: 0.45 },
      { minD: 50, maxD: 1200, emoji: "🐢", size: 24, speed: 0.35 },
      { minD: 150, maxD: 1800, emoji: "🐬", size: 24, speed: 0.75 },
      { minD: 400, maxD: 3200, emoji: "🪼", size: 24, speed: 0.2, glow: "#38bdf8" },
      { minD: 800, maxD: 4500, emoji: "🦑", size: 24, speed: 0.5, glow: "#c084fc" },
      { minD: 1200, maxD: 5800, emoji: "🦈", size: 28, speed: 0.85, glow: "#94a3b8" },
      { minD: 2500, maxD: 7200, emoji: "🐡", size: 22, speed: 0.3, glow: "#facc15" },
      { minD: 3800, maxD: 7400, emoji: "🐉", size: 26, speed: 0.55, glow: "#facc15" }
    ];
    const tpl = bank[i % bank.length];
    return {
      depth: tpl.minD + Math.random() * (tpl.maxD - tpl.minD),
      xNorm: 0.1 + Math.random() * 0.78,
      emoji: tpl.emoji,
      size: tpl.size,
      speed: tpl.speed * (Math.random() > 0.5 ? 1 : -1) * 0.0008,
      glow: tpl.glow || null
    };
  }),
  particles: Array.from({ length: 60 }, () => ({
    xNorm: Math.random(),
    yNorm: Math.random(),
    r: 1 + Math.random() * 2.8,
    speed: 0.001 + Math.random() * 0.0025,
    alpha: 0.15 + Math.random() * 0.5
  })),
  kelps: Array.from({ length: 12 }, (_, i) => ({
    xNorm: i < 6 ? 0.03 + i * 0.045 : 0.72 + (i - 6) * 0.045,
    phase: Math.random() * Math.PI * 2,
    heightFactor: 0.25 + Math.random() * 0.32
  }))
};

function lerpNum(a, b, t) {
  return a + (b - a) * t;
}

function getOceanColorsAtDepth(depth) {
  const stops = [
    { d: 0, top: [7, 56, 108], bot: [4, 28, 62] },
    { d: 800, top: [5, 38, 82], bot: [3, 18, 44] },
    { d: 2200, top: [14, 20, 62], bot: [7, 8, 32] },
    { d: 4500, top: [12, 8, 34], bot: [3, 2, 12] },
    { d: 7000, top: [4, 2, 14], bot: [1, 1, 5] }
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
  if (depth >= s1.d) s0 = s1;
  const span = Math.max(1, s1.d - s0.d);
  const t = Math.min(1, Math.max(0, (depth - s0.d) / span));
  return {
    top: `rgb(${Math.round(lerpNum(s0.top[0], s1.top[0], t))},${Math.round(lerpNum(s0.top[1], s1.top[1], t))},${Math.round(lerpNum(s0.top[2], s1.top[2], t))})`,
    bot: `rgb(${Math.round(lerpNum(s0.bot[0], s1.bot[0], t))},${Math.round(lerpNum(s0.bot[1], s1.bot[1], t))},${Math.round(lerpNum(s0.bot[2], s1.bot[2], t))})`
  };
}

function getZoneLabelAtDepth(depth) {
  if (depth >= 890) return { text: "🟡 LEGENDA PALUNG", color: "#facc15" };
  if (depth >= 650) return { text: "🟣 ZONA ABISAL", color: "#c084fc" };
  if (depth >= 350) return { text: "🔵 TERUMBU KARANG", color: "#38bdf8" };
  return { text: "🟢 ZONA PLANKTON", color: "#10b981" };
}

// Gambar Kapal Selam Ikonik PALUNG.IO (Periskop, Jendela Maskot, Baling-baling & Sorot Lampu)
function drawPalungSubmarine(ctx2d, x, y, now, scale, isMe, color, avatar, labelText, wordTag, isCollision, isSole, camDepth, isDiving) {
  ctx2d.save();
  ctx2d.translate(x, y);
  ctx2d.scale(scale, scale);

  const hullColor = isCollision ? "#f43f5e" : isMe ? "#facc15" : color || "#38bdf8";
  const subW = 48;
  const subH = 22;

  // 1. Sorot Lampu Kapal Selam ke Bawah (Makin terang saat makin dalam!)
  const beamAlpha = Math.min(0.42, 0.09 + ((camDepth || 0) / 3000) * 0.33);
  const beamGrad = ctx2d.createLinearGradient(0, 6, 0, 92);
  beamGrad.addColorStop(0, isMe ? `rgba(254, 240, 138, ${beamAlpha})` : `rgba(186, 230, 253, ${beamAlpha * 0.7})`);
  beamGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
  ctx2d.beginPath();
  ctx2d.moveTo(-10, subH / 2);
  ctx2d.lineTo(-34, 92);
  ctx2d.lineTo(34, 92);
  ctx2d.lineTo(10, subH / 2);
  ctx2d.closePath();
  ctx2d.fillStyle = beamGrad;
  ctx2d.fill();

  // 2. Halo Bioluminesensi
  const radGrad = ctx2d.createRadialGradient(0, 0, 4, 0, 0, isMe ? 38 : 28);
  radGrad.addColorStop(0, isCollision ? "rgba(244, 63, 94, 0.45)" : isMe ? "rgba(250, 204, 21, 0.32)" : "rgba(56, 189, 248, 0.22)");
  radGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx2d.fillStyle = radGrad;
  ctx2d.beginPath();
  ctx2d.arc(0, 0, isMe ? 38 : 28, 0, Math.PI * 2);
  ctx2d.fill();

  if (isSole) {
    ctx2d.beginPath();
    ctx2d.arc(0, 0, 30 + Math.sin(now * 0.01) * 3, 0, Math.PI * 2);
    ctx2d.strokeStyle = "rgba(250, 204, 21, 0.82)";
    ctx2d.lineWidth = 2;
    ctx2d.stroke();
  }

  // 3. Badan Kapal Selam (Sedikit menukik saat diving)
  ctx2d.save();
  ctx2d.rotate((isDiving ? 0.14 : 0) + Math.sin(now * 0.004) * 0.04);

  // Sirip ekor & Baling-baling belakang (kiri)
  ctx2d.fillStyle = "#f43f5e";
  ctx2d.beginPath();
  ctx2d.moveTo(-subW / 2 + 2, 0);
  ctx2d.lineTo(-subW / 2 - 8, -7);
  ctx2d.lineTo(-subW / 2 - 8, 7);
  ctx2d.closePath();
  ctx2d.fill();

  // Gelembung jejak baling-baling
  if (isDiving || Math.sin(now * 0.01) > 0) {
    ctx2d.fillStyle = "rgba(186, 230, 253, 0.65)";
    ctx2d.beginPath();
    ctx2d.arc(-subW / 2 - 12, Math.sin(now * 0.02) * 3, 2.2, 0, Math.PI * 2);
    ctx2d.arc(-subW / 2 - 17, Math.cos(now * 0.02) * 4, 1.5, 0, Math.PI * 2);
    ctx2d.fill();
  }

  // Menara & Periskop
  ctx2d.fillStyle = hullColor;
  ctx2d.beginPath();
  ctx2d.roundRect(-8, -subH / 2 - 7, 16, 8, 3);
  ctx2d.fill();
  ctx2d.strokeStyle = hullColor;
  ctx2d.lineWidth = 2.5;
  ctx2d.lineCap = "round";
  ctx2d.beginPath();
  ctx2d.moveTo(0, -subH / 2 - 6);
  ctx2d.lineTo(0, -subH / 2 - 13);
  ctx2d.lineTo(6, -subH / 2 - 13);
  ctx2d.stroke();

  // Lampu beacon kecil di atas periskop
  ctx2d.fillStyle = isCollision ? "#f43f5e" : "#38bdf8";
  ctx2d.beginPath();
  ctx2d.arc(7, -subH / 2 - 13, 2, 0, Math.PI * 2);
  ctx2d.fill();

  // Lambung Utama Kapal Selam
  ctx2d.shadowColor = hullColor;
  ctx2d.shadowBlur = isMe ? 14 : 6;
  ctx2d.beginPath();
  ctx2d.roundRect(-subW / 2, -subH / 2, subW, subH, subH / 2);
  ctx2d.fillStyle = isMe ? "#0f172a" : "#091528";
  ctx2d.fill();
  ctx2d.lineWidth = isMe ? 2.8 : 2;
  ctx2d.strokeStyle = hullColor;
  ctx2d.stroke();
  ctx2d.shadowBlur = 0;

  // Jendela Kaca Bulat dengan Maskot Pemain di Dalamnya
  ctx2d.beginPath();
  ctx2d.arc(3, 0, 8.5, 0, Math.PI * 2);
  ctx2d.fillStyle = "#0369a1";
  ctx2d.fill();
  ctx2d.lineWidth = 1.6;
  ctx2d.strokeStyle = "#7dd3fc";
  ctx2d.stroke();

  ctx2d.font = "11px sans-serif";
  ctx2d.textAlign = "center";
  ctx2d.textBaseline = "middle";
  ctx2d.fillText(avatar || "🤿", 3, 0.5);

  // Jendela kecil tambahan di sisi kiri
  ctx2d.beginPath();
  ctx2d.arc(-13, 0, 3.8, 0, Math.PI * 2);
  ctx2d.fillStyle = "#38bdf8";
  ctx2d.fill();

  ctx2d.restore();

  // 4. Label Nama di Atas Kapal Selam
  if (labelText) {
    ctx2d.font = "700 10px Outfit, sans-serif";
    ctx2d.textAlign = "center";
    ctx2d.fillStyle = isMe ? "#fef08a" : "rgba(203, 213, 225, 0.82)";
    ctx2d.fillText(labelText, 0, -29);
  }

  // 5. Kartu Kata Jawaban di Bawah Kapal Selam (Saat Descend)
  if (wordTag) {
    ctx2d.font = "800 11px Outfit, monospace";
    const tw = ctx2d.measureText(wordTag).width + 18;
    ctx2d.save();
    ctx2d.translate(0, 29);
    ctx2d.rotate(isMe ? -0.02 : 0.015);
    ctx2d.fillStyle = "rgba(4, 13, 28, 0.92)";
    ctx2d.strokeStyle = isCollision ? "#f43f5e" : isMe ? "#facc15" : "rgba(56, 189, 248, 0.55)";
    ctx2d.lineWidth = 1.4;
    ctx2d.beginPath();
    ctx2d.roundRect(-tw / 2, -10, tw, 22, 6);
    ctx2d.fill();
    ctx2d.stroke();

    ctx2d.fillStyle = isCollision ? "#fda4af" : isMe ? "#fef08a" : "#e2e8f0";
    ctx2d.textAlign = "center";
    ctx2d.textBaseline = "middle";
    ctx2d.fillText(wordTag, 0, 1);
    ctx2d.restore();
  }

  ctx2d.restore();
}

function stopDescendAnimation() {
  if (oceanWorld.diveFinishTimer) {
    clearTimeout(oceanWorld.diveFinishTimer);
    oceanWorld.diveFinishTimer = null;
  }
  oceanWorld.diveActive = false;
  oceanWorld.diveOnDone = null;
}

const btnSkipDescend = document.getElementById("btn-skip-descend");
if (btnSkipDescend) {
  btnSkipDescend.addEventListener("click", () => {
    const cb = oceanWorld.diveOnDone;
    oceanWorld.cameraDepth = oceanWorld.diveToDepth;
    oceanWorld.targetCameraDepth = oceanWorld.diveToDepth;
    stopDescendAnimation();
    if (typeof cb === "function") cb();
  });
}

function ensurePersistentOceanRunning() {
  if (oceanWorld.rafId) return;

  function tick(now) {
    oceanWorld.rafId = requestAnimationFrame(tick);
    if (!screens.game || !screens.game.classList.contains("active")) return;

    const pCanvas = document.getElementById("persistent-ocean-canvas");
    if (!pCanvas || !pCanvas.parentElement) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = pCanvas.parentElement.getBoundingClientRect();
    const W = Math.max(300, Math.round(rect.width));
    const H = Math.max(340, Math.round(rect.height));
    if (pCanvas.width !== W * dpr || pCanvas.height !== H * dpr) {
      pCanvas.width = W * dpr;
      pCanvas.height = H * dpr;
    }

    const oCtx = pCanvas.getContext("2d");
    oCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Hitung cameraDepth saat ini (baik saat mengambang maupun saat descend!)
    let speedM = 0;
    let diveProgress = 0;
    if (oceanWorld.diveActive) {
      const elapsed = now - oceanWorld.diveStartTime;
      const rawP = Math.min(1, elapsed / oceanWorld.diveDurationMs);
      diveProgress = 1 - Math.pow(1 - rawP, 3);
      const nextCam = lerpNum(oceanWorld.diveFromDepth, oceanWorld.diveToDepth, diveProgress);
      speedM = Math.max(0, nextCam - oceanWorld.cameraDepth);
      oceanWorld.cameraDepth = nextCam;

      // Update odometer HUD ronde ini
      const myRes =
        oceanWorld.diveResults.find((r) => r.playerId === oceanWorld.diveMyId) ||
        oceanWorld.diveResults[0];
      const myGainNow = Math.round((myRes ? myRes.depthGained : 0) * diveProgress);
      const odoEl = document.getElementById("descend-depth-counter");
      const zoneBadge = document.getElementById("descend-zone-badge");
      const hudDepth = document.getElementById("hud-my-depth");
      if (odoEl) odoEl.textContent = `+${formatMeters(myGainNow)}`;
      if (hudDepth) hudDepth.textContent = formatMeters(Math.round(oceanWorld.diveFromDepth + myGainNow));
      if (zoneBadge) {
        const z = getZoneLabelAtDepth(myGainNow);
        zoneBadge.textContent = z.text;
        zoneBadge.style.borderColor = z.color;
        zoneBadge.style.color = z.color;
      }

      if (now - oceanWorld.lastBubbleTime > 165 && speedM > 0.8) {
        oceanWorld.lastBubbleTime = now;
        playBubblePop(0.03);
      }
      if (myGainNow >= 890 && oceanWorld.lastTierSound < 3) {
        oceanWorld.lastTierSound = 3;
        playSonarPing(1046.5, 0.25);
        triggerHaptic([40, 30, 80]);
      } else if (myGainNow >= 650 && oceanWorld.lastTierSound < 2) {
        oceanWorld.lastTierSound = 2;
        playSonarPing(783.99, 0.2);
        triggerHaptic(35);
      } else if (myGainNow >= 350 && oceanWorld.lastTierSound < 1) {
        oceanWorld.lastTierSound = 1;
        playSonarPing(659.25, 0.16);
      }

      if (rawP >= 1 && !oceanWorld.diveFinishTimer) {
        oceanWorld.diveFinishTimer = setTimeout(() => {
          const cb = oceanWorld.diveOnDone;
          oceanWorld.targetCameraDepth = oceanWorld.diveToDepth;
          stopDescendAnimation();
          if (typeof cb === "function") cb();
        }, 520);
      }
    } else {
      // Transisi halus saat diam/menunggu soal
      oceanWorld.cameraDepth += (oceanWorld.targetCameraDepth - oceanWorld.cameraDepth) * 0.08;
    }

    const camD = oceanWorld.cameraDepth;
    const pxPerMeter = 1.65;
    const anchorY = oceanWorld.diveActive || oceanWorld.showRevealTags ? H * 0.44 : H * 0.68;

    // 1. Gradasi Air Samudra Berkelanjutan
    const cols = getOceanColorsAtDepth(camD);
    const bgGrad = oCtx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, cols.top);
    bgGrad.addColorStop(1, cols.bot);
    oCtx.fillStyle = bgGrad;
    oCtx.fillRect(0, 0, W, H);

    // 2. Sinar Matahari Tipis dari Permukaan (memudar perlahan hingga 1.200m)
    if (camD < 1200) {
      const rayAlpha = Math.max(0, (1 - camD / 1200) * 0.16);
      for (let i = 0; i < 4; i++) {
        const rx = W * (0.14 + i * 0.23) + Math.sin(now * 0.0008 + i) * 16;
        const rGrad = oCtx.createLinearGradient(rx, 0, rx + 35, H * 0.8);
        rGrad.addColorStop(0, `rgba(186, 230, 253, ${rayAlpha})`);
        rGrad.addColorStop(1, "rgba(186, 230, 253, 0)");
        oCtx.fillStyle = rGrad;
        oCtx.beginPath();
        oCtx.moveTo(rx - 18, 0);
        oCtx.lineTo(rx + 22, 0);
        oCtx.lineTo(rx + 85, H);
        oCtx.lineTo(rx - 25, H);
        oCtx.closePath();
        oCtx.fill();
      }
    }

    // 2B. Bioluminescent Sonar HUD Rings & Sweep (di belakang kapal selam)
    oCtx.save();
    const sonarCx = W * 0.5;
    const sonarCy = anchorY;
    const sonarMaxR = Math.min(W, H) * 0.44;
    oCtx.strokeStyle = "rgba(56, 189, 248, 0.065)";
    oCtx.lineWidth = 1;
    for (let rIdx = 1; rIdx <= 3; rIdx++) {
      oCtx.beginPath();
      oCtx.arc(sonarCx, sonarCy, (sonarMaxR * rIdx) / 3, 0, Math.PI * 2);
      oCtx.stroke();
    }
    const sweepAngle = (now * 0.00075) % (Math.PI * 2);
    const sweepGrad = oCtx.createLinearGradient(
      sonarCx,
      sonarCy,
      sonarCx + Math.cos(sweepAngle) * sonarMaxR,
      sonarCy + Math.sin(sweepAngle) * sonarMaxR
    );
    sweepGrad.addColorStop(0, "rgba(34, 211, 238, 0.14)");
    sweepGrad.addColorStop(1, "rgba(34, 211, 238, 0)");
    oCtx.strokeStyle = sweepGrad;
    oCtx.lineWidth = 2;
    oCtx.beginPath();
    oCtx.moveTo(sonarCx, sonarCy);
    oCtx.lineTo(
      sonarCx + Math.cos(sweepAngle) * sonarMaxR,
      sonarCy + Math.sin(sweepAngle) * sonarMaxR
    );
    oCtx.stroke();
    oCtx.restore();

    // 2C. Partikel Plankton Bioluminesensi (cyan, teal, ungu abyssal)
    oCtx.save();
    for (let i = 0; i < 24; i++) {
      const px = ((Math.sin(i * 78.233 + now * 0.00018) * 0.5 + 0.5) * W);
      const py = (((i * 97 + camD * 0.65 - now * 0.018) % H) + H) % H;
      const pulse = 0.45 + 0.55 * Math.sin(now * 0.003 + i * 1.7);
      const bioPalette = ["34, 211, 238", "52, 211, 153", "167, 139, 250"];
      const rgb = bioPalette[i % bioPalette.length];
      oCtx.beginPath();
      oCtx.arc(px, py, 3.8, 0, Math.PI * 2);
      oCtx.fillStyle = `rgba(${rgb}, ${0.14 * pulse})`;
      oCtx.fill();
      oCtx.beginPath();
      oCtx.arc(px, py, 1.5, 0, Math.PI * 2);
      oCtx.fillStyle = `rgba(${rgb}, ${0.62 * pulse})`;
      oCtx.fill();
    }
    oCtx.restore();

    // 3. Layered Abyssal Silhouette (Tebing Palung & Rumput Laut Berlapis)
    oCtx.fillStyle = "rgba(2, 10, 24, 0.52)";
    oCtx.beginPath();
    oCtx.moveTo(0, H);
    oCtx.lineTo(0, H * 0.84);
    for (let x = 0; x <= W + 40; x += 40) {
      const y = H * 0.85 + Math.sin(x * 0.008 + now * 0.0006) * 14 + Math.cos(x * 0.015) * 8;
      oCtx.lineTo(x, y);
    }
    oCtx.lineTo(W, H);
    oCtx.closePath();
    oCtx.fill();

    oCtx.fillStyle = "rgba(2, 10, 22, 0.45)";
    oceanWorld.kelps.forEach((k) => {
      const kx = k.xNorm * W;
      const sway = Math.sin(now * 0.0014 + k.phase) * 12;
      const kelpH = H * k.heightFactor;
      const baseScroll = (camD * 0.35) % (H * 0.5);
      const baseY = H + 30 - baseScroll * 0.25;
      oCtx.beginPath();
      oCtx.moveTo(kx - 10, baseY);
      oCtx.quadraticCurveTo(kx + sway, baseY - kelpH * 0.55, kx + sway * 0.6, baseY - kelpH);
      oCtx.quadraticCurveTo(kx + 12 + sway * 0.4, baseY - kelpH * 0.45, kx + 10, baseY);
      oCtx.closePath();
      oCtx.fill();
    });

    // 4. Garis Horizontal Milestone Kedalaman (Putus-Putus ala Krillion!)
    OCEAN_MILESTONES.forEach((ms) => {
      const myY = anchorY + (ms.depth - camD) * pxPerMeter;
      if (myY > 56 && myY < H - 30) {
        oCtx.save();
        oCtx.setLineDash([5, 5]);
        oCtx.strokeStyle = ms.color + "55";
        oCtx.lineWidth = 1;
        oCtx.beginPath();
        oCtx.moveTo(16, myY);
        oCtx.lineTo(W - 62, myY);
        oCtx.stroke();
        oCtx.setLineDash([]);
        oCtx.font = "700 10px Outfit, monospace";
        oCtx.fillStyle = ms.color + "bb";
        oCtx.textAlign = "right";
        oCtx.fillText(ms.label, W - 66, myY - 5);
        oCtx.restore();
      }
    });

    // Garis posisi kedalaman pemain saat ini (Putus-putus putih terang saat descend)
    if (oceanWorld.diveActive) {
      oCtx.save();
      oCtx.setLineDash([4, 4]);
      oCtx.strokeStyle = "rgba(226, 232, 240, 0.38)";
      oCtx.lineWidth = 1;
      oCtx.beginPath();
      oCtx.moveTo(12, anchorY);
      oCtx.lineTo(W - 58, anchorY);
      oCtx.stroke();
      oCtx.restore();
    }

    // 4B. Pengumuman Jawaban Terlangka di Belakang Kapal Selam (ikut tenggelam & menyatu dengan laut)
    if (oceanWorld.rarestBanner && !oceanWorld.diveActive) {
      const rb = oceanWorld.rarestBanner;
      const elapsedSec = Math.max(0, (now - rb.startTime) / 1000);
      const sinkY = Math.min(26, elapsedSec * 4.5);
      const fadeAlpha = Math.min(0.68, elapsedSec * 1.1);
      oCtx.save();
      oCtx.globalAlpha = fadeAlpha;
      oCtx.textAlign = "center";
      oCtx.textBaseline = "middle";
      const textY = anchorY - 72 + sinkY;
      oCtx.font = "800 15px Outfit, sans-serif";
      oCtx.fillStyle = "rgba(186, 230, 253, 0.88)";
      oCtx.fillText(rb.title, W * 0.5, textY);

      if (rb.fact) {
        oCtx.font = "500 12px 'Plus Jakarta Sans', sans-serif";
        oCtx.fillStyle = "rgba(148, 163, 184, 0.85)";
        const words = rb.fact.split(/\s+/);
        const maxW = Math.min(W - 60, 420);
        let line = "";
        let lineY = textY + 20;
        let lineCount = 0;
        for (let wi = 0; wi < words.length; wi++) {
          const testLine = line ? line + " " + words[wi] : words[wi];
          if (oCtx.measureText(testLine).width > maxW && line) {
            oCtx.fillText(line, W * 0.5, lineY);
            line = words[wi];
            lineY += 16;
            lineCount++;
            if (lineCount >= 2) break;
          } else {
            line = testLine;
          }
        }
        if (line && lineCount < 2) {
          oCtx.fillText(line, W * 0.5, lineY);
        }
      }
      oCtx.restore();
    }

    // 5. Biota Laut Melintas di Air
    oceanWorld.creatures.forEach((c) => {
      c.xNorm += c.speed;
      if (c.xNorm < 0.06) c.xNorm = 0.88;
      if (c.xNorm > 0.88) c.xNorm = 0.06;
      const cy = anchorY + (c.depth - camD) * pxPerMeter;
      if (cy > 45 && cy < H - 25) {
        oCtx.save();
        if (c.glow || camD > 1200) {
          oCtx.shadowColor = c.glow || "#38bdf8";
          oCtx.shadowBlur = 12;
        }
        oCtx.globalAlpha = oceanWorld.diveActive ? 0.88 : 0.45;
        oCtx.font = `${c.size}px sans-serif`;
        oCtx.textAlign = "center";
        oCtx.textBaseline = "middle";
        oCtx.fillText(c.emoji, c.xNorm * W, cy);
        oCtx.restore();
      }
    });

    // 6. Partikel Salju Laut & Gelembung Naik
    oceanWorld.particles.forEach((p) => {
      p.yNorm -= p.speed + (speedM * 0.0009);
      if (p.yNorm < 0) {
        p.yNorm = 1;
        p.xNorm = Math.random();
      }
      oCtx.beginPath();
      oCtx.arc(p.xNorm * W, p.yNorm * H, p.r, 0, Math.PI * 2);
      oCtx.fillStyle =
        camD > 2000
          ? `rgba(192, 132, 252, ${p.alpha})`
          : `rgba(186, 230, 253, ${p.alpha})`;
      oCtx.fill();
    });

    // 7. Penggaris Kedalaman di Tepi Kanan (-100m, -200m...) + Jarum "YOU"
    oCtx.save();
    const rulerX = W - 12;
    oCtx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    oCtx.lineWidth = 1;
    oCtx.beginPath();
    oCtx.moveTo(rulerX, 60);
    oCtx.lineTo(rulerX, H - 20);
    oCtx.stroke();

    const startTick = Math.max(0, Math.floor((camD - H / (2 * pxPerMeter)) / 25) * 25);
    const endTick = Math.ceil((camD + H / (2 * pxPerMeter)) / 25) * 25;
    oCtx.font = "600 9px monospace";
    oCtx.textAlign = "right";
    for (let m = startTick; m <= endTick; m += 25) {
      const ty = anchorY + (m - camD) * pxPerMeter;
      if (ty > 64 && ty < H - 22) {
        const isMajor = m % 100 === 0;
        oCtx.strokeStyle = isMajor ? "rgba(186, 230, 253, 0.55)" : "rgba(148, 163, 184, 0.25)";
        oCtx.beginPath();
        oCtx.moveTo(rulerX - (isMajor ? 10 : 5), ty);
        oCtx.lineTo(rulerX, ty);
        oCtx.stroke();
        if (isMajor) {
          oCtx.fillStyle = "rgba(203, 213, 225, 0.72)";
          oCtx.fillText(`-${m}m`, rulerX - 13, ty + 3);
        }
      }
    }

    // Jarum Penunjuk "YOU"
    oCtx.fillStyle = "#facc15";
    oCtx.beginPath();
    oCtx.moveTo(rulerX - 14, anchorY);
    oCtx.lineTo(rulerX - 2, anchorY - 4);
    oCtx.lineTo(rulerX - 2, anchorY + 4);
    oCtx.closePath();
    oCtx.fill();
    oCtx.font = "800 9px Outfit, sans-serif";
    oCtx.fillText("YOU", rulerX - 17, anchorY + 3);
    oCtx.restore();

    // 8. Render Kapal Selam PALUNG.IO Pemain (Saat Menyelam, Pasca-Selam, MAUPUN Saat Mengambang Membaca Soal!)
    if (oceanWorld.diveActive || oceanWorld.showRevealTags) {
      const pProg = oceanWorld.diveActive ? diveProgress : 1;
      const isDivingNow = oceanWorld.diveActive;
      const count = oceanWorld.diveResults.length || 1;
      oceanWorld.diveResults.forEach((r, idx) => {
        const startD = Math.max(0, (r.totalDepth || 0) - (r.depthGained || 0));
        const curD = startD + (r.depthGained || 0) * pProg;
        const laneX = count === 1 ? W * 0.5 : W * (0.18 + (idx / (count - 1)) * 0.62);
        const bob = isDivingNow ? 0 : Math.sin(now * 0.0025 + idx) * 4;
        const dy = anchorY + (curD - camD) * pxPerMeter + bob;
        const isMe = r.playerId === oceanWorld.diveMyId;
        if (dy > 48 && dy < H - 35) {
          const wordTag = r.answered
            ? `"${r.canonicalName.toUpperCase()}" ${r.isCollision ? "💥" : `+${r.depthGained}m`}`
            : "0m";
          drawPalungSubmarine(
            oCtx,
            laneX,
            dy,
            now,
            isMe ? 1.15 : 0.85,
            isMe,
            r.playerColor,
            r.playerAvatar,
            `${r.playerName.slice(0, 8)} • ${Math.round(curD)}m`,
            isMe || pProg > 0.35 ? wordTag : null,
            r.isCollision,
            r.isSoleExplorer,
            camD,
            isDivingNow
          );
        }
      });
    } else if (currentRoom && currentRoom.players) {
      const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
      const players = currentRoom.players;
      const count = players.length || 1;
      players.forEach((p, idx) => {
        const isMe = p.id === myId;
        const pDepth = p.totalDepth || 0;
        const laneX = isMe
          ? W * 0.24
          : W * (0.45 + ((idx % Math.max(1, count - 1)) / Math.max(1, count)) * 0.38);
        const py = isMe
          ? anchorY + Math.sin(now * 0.0025) * 5
          : anchorY + (pDepth - camD) * pxPerMeter + Math.sin(now * 0.002 + idx) * 4;
        if (py > 60 && py < H - 65) {
          oCtx.save();
          if (!isMe) oCtx.globalAlpha = 0.65;
          drawPalungSubmarine(
            oCtx,
            laneX,
            py,
            now,
            isMe ? 1.05 : 0.74,
            isMe,
            p.color,
            p.avatar,
            isMe ? null : `${p.name.slice(0, 7)} (${pDepth}m)`,
            null,
            false,
            false,
            camD,
            false
          );
          oCtx.restore();
        }
      });
    }
  }

  oceanWorld.rafId = requestAnimationFrame(tick);
}

function playGroupDescendAnimation(payload, onDone) {
  stopDescendAnimation();
  ensurePersistentOceanRunning();

  const phaseDescend = document.getElementById("phase-descend");
  document.getElementById("phase-playing").classList.add("hidden");
  document.getElementById("phase-reveal").classList.add("hidden");
  if (phaseDescend) phaseDescend.classList.remove("hidden");

  const results = payload.results || [];
  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
  const myResult = results.find((r) => r.playerId === myId) || results[0];

  const myNewDepth = myResult ? myResult.totalDepth : oceanWorld.cameraDepth;
  const myGain = myResult ? myResult.depthGained : 0;
  const fromDepth = Math.max(0, myNewDepth - myGain);

  const answerPillEl = document.getElementById("descend-my-answer-pill");
  if (answerPillEl) {
    if (myResult && myResult.answered) {
      answerPillEl.textContent = `📡 "${myResult.canonicalName}"${
        myResult.isCollision ? " • 💥 Tabrakan!" : myResult.isSoleExplorer ? " • 🌟 Penemu Tunggal!" : ""
      }`;
    } else {
      answerPillEl.textContent = "💨 Kehabisan Oksigen — Tidak Menjawab";
    }
  }

  const ambientEl = document.getElementById("descend-ambient-fact");
  if (ambientEl) {
    ambientEl.textContent =
      AMBIENT_OCEAN_FACTS[Math.floor(Math.random() * AMBIENT_OCEAN_FACTS.length)];
  }

  oceanWorld.diveResults = results;
  oceanWorld.diveMyId = myId;
  oceanWorld.diveFromDepth = fromDepth;
  oceanWorld.diveToDepth = myNewDepth;
  oceanWorld.cameraDepth = fromDepth;
  oceanWorld.diveStartTime = performance.now();
  oceanWorld.diveDurationMs = 4000;
  oceanWorld.lastTierSound = 0;
  oceanWorld.lastBubbleTime = 0;
  oceanWorld.diveActive = true;
  oceanWorld.showRevealTags = false;
  oceanWorld.diveOnDone = () => {
    oceanWorld.showRevealTags = true;
    if (phaseDescend) phaseDescend.classList.add("hidden");
    onDone();
  };
}

// Kontrol Tab Bar Bawah Floating (Fakta | Legenda | Detail Kru)
document.querySelectorAll(".oib-tab[data-oib]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const mode = btn.dataset.oib;
    document.querySelectorAll(".oib-tab[data-oib]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("oib-panel-fact").classList.toggle("hidden", mode !== "fact");
    document.getElementById("oib-panel-legend").classList.toggle("hidden", mode !== "legend");
  });
});

const btnToggleRevealDetail = document.getElementById("btn-toggle-reveal-detail");
const revealDetailDrawer = document.getElementById("reveal-detail-drawer");
const btnCloseRevealDetail = document.getElementById("btn-close-reveal-detail");
if (btnToggleRevealDetail && revealDetailDrawer) {
  btnToggleRevealDetail.addEventListener("click", () => {
    const isHidden = revealDetailDrawer.classList.toggle("hidden");
    btnToggleRevealDetail.classList.toggle("active", !isHidden);
  });
}
if (btnCloseRevealDetail && revealDetailDrawer && btnToggleRevealDetail) {
  btnCloseRevealDetail.addEventListener("click", () => {
    revealDetailDrawer.classList.add("hidden");
    btnToggleRevealDetail.classList.remove("active");
  });
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
      const shortTitle = `${payload.rarestGuessed.canonicalName} ditemukan oleh ${payload.rarestGuessed.finderName}`;
      const shortFact = payload.rarestGuessed.fact || payload.educationalNote || "";
      oceanWorld.rarestBanner = {
        title: shortTitle,
        fact: shortFact,
        startTime: performance.now()
      };
      document.getElementById("spotlight-answer-title").textContent = shortTitle;
      document.getElementById("spotlight-answer-fact").textContent = shortFact;
    } else {
      oceanWorld.rarestBanner = null;
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
// LAYAR GAME OVER & FINALE 5-IN-1 (PODIUM, PARTY AWARDS, GRAFIK, LOG, POSTER PNG)
// ============================================================================
let lastGameOverPayload = null;
let confettiRafId = null;

function stopGameOverConfetti() {
  if (confettiRafId) {
    cancelAnimationFrame(confettiRafId);
    confettiRafId = null;
  }
}

function startGameOverConfetti() {
  stopGameOverConfetti();
  const cCanvas = document.getElementById("gameover-confetti-canvas");
  if (!cCanvas || !cCanvas.parentElement) return;
  const cCtx = cCanvas.getContext("2d");
  const rect = cCanvas.parentElement.getBoundingClientRect();
  const W = Math.max(300, Math.round(rect.width));
  const H = Math.max(300, Math.round(rect.height));
  cCanvas.width = W;
  cCanvas.height = H;

  const colors = ["#facc15", "#38bdf8", "#10b981", "#c084fc", "#fb7185"];
  const pieces = Array.from({ length: 42 }, () => ({
    x: Math.random() * W,
    y: H + Math.random() * 140,
    vy: 0.7 + Math.random() * 1.4,
    vx: (Math.random() - 0.5) * 0.6,
    r: 2 + Math.random() * 3.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 0.35 + Math.random() * 0.5
  }));

  function frame() {
    if (!screens.gameover.classList.contains("active")) {
      stopGameOverConfetti();
      return;
    }
    cCtx.clearRect(0, 0, W, H);
    pieces.forEach((p) => {
      p.y -= p.vy;
      p.x += p.vx + Math.sin(p.y * 0.03) * 0.35;
      if (p.y < -12) {
        p.y = H + 12;
        p.x = Math.random() * W;
      }
      cCtx.globalAlpha = p.alpha;
      cCtx.fillStyle = p.color;
      cCtx.beginPath();
      cCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      cCtx.fill();
    });
    cCtx.globalAlpha = 1;
    confettiRafId = requestAnimationFrame(frame);
  }
  confettiRafId = requestAnimationFrame(frame);
}

function computePartyAwards(standings) {
  const awards = [];
  if (!standings || standings.length === 0) return awards;

  // 1. Pemburu Mutiara (Jawaban satu ronde paling dalam)
  const withBest = standings.filter((p) => p.bestAnswer);
  if (withBest.length > 0) {
    const pearl = [...withBest].sort((a, b) => b.bestAnswer.depthGained - a.bestAnswer.depthGained)[0];
    awards.push({
      icon: "💎",
      title: "Pemburu Mutiara",
      winner: `${pearl.avatar} ${pearl.name}`,
      desc: `${pearl.bestAnswer.answerName} (+${formatMeters(pearl.bestAnswer.depthGained)})`
    });
  }

  // 2. Magnet Tabrakan
  const colliders = standings.filter((p) => (p.collisionsCount || 0) > 0);
  if (colliders.length > 0) {
    const magnet = [...colliders].sort((a, b) => (b.collisionsCount || 0) - (a.collisionsCount || 0))[0];
    awards.push({
      icon: "💥",
      title: "Magnet Tabrakan",
      winner: `${magnet.avatar} ${magnet.name}`,
      desc: `${magnet.collisionsCount}x jawaban sama dengan kru!`
    });
  }

  // 3. Serigala Tunggal
  const soloists = standings.filter((p) => (p.uniqueBonusCount || 0) > 0);
  if (soloists.length > 0) {
    const wolf = [...soloists].sort((a, b) => (b.uniqueBonusCount || 0) - (a.uniqueBonusCount || 0))[0];
    awards.push({
      icon: "🌟",
      title: "Serigala Tunggal",
      winner: `${wolf.avatar} ${wolf.name}`,
      desc: `${wolf.uniqueBonusCount}x bonus Penemu Tunggal!`
    });
  }

  // 4. Paru-Paru Baja (Oksigen tersisa tertinggi)
  const oxyPlayers = standings.filter((p) => typeof p.oxygen === "number");
  if (oxyPlayers.length > 0) {
    const ironLung = [...oxyPlayers].sort((a, b) => (b.oxygen || 0) - (a.oxygen || 0))[0];
    awards.push({
      icon: "🫧",
      title: "Paru-Paru Baja",
      winner: `${ironLung.avatar} ${ironLung.name}`,
      desc: `Sisa oksigen ${ironLung.oxygen}% di akhir selam`
    });
  }
  return awards;
}

function renderDiveProfileChart(payload) {
  const chartCanvas = document.getElementById("dive-profile-canvas");
  const legendEl = document.getElementById("dive-chart-legend");
  if (!chartCanvas || !chartCanvas.parentElement) return;

  const history = payload.roundHistory || [];
  const standings = payload.standings || [];
  if (history.length === 0 || standings.length === 0) {
    legendEl.innerHTML = `<span style="color:#94a3b8">Data grafik belum tersedia.</span>`;
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = chartCanvas.parentElement.getBoundingClientRect();
  const W = Math.max(300, Math.round(rect.width));
  const H = Math.max(220, Math.round(rect.height));
  chartCanvas.width = W * dpr;
  chartCanvas.height = H * dpr;
  const gCtx = chartCanvas.getContext("2d");
  gCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Hitung kumulatif tiap pemain per ronde (0 -> R1 -> ... -> RN)
  const series = standings.map((p, idx) => {
    const pts = [0];
    let acc = 0;
    history.forEach((rd) => {
      const rObj = (rd.results || []).find((r) => r.playerId === p.id);
      acc = rObj ? rObj.totalDepth : acc;
      pts.push(acc);
    });
    return {
      name: p.name,
      avatar: p.avatar,
      color: p.color || ["#facc15", "#38bdf8", "#10b981", "#c084fc", "#fb7185"][idx % 5],
      pts
    };
  });

  const maxDepth = Math.max(1000, ...series.flatMap((s) => s.pts));
  const padL = 50;
  const padR = 18;
  const padT = 18;
  const padB = 28;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const roundsCount = history.length;

  gCtx.clearRect(0, 0, W, H);

  // Grid kedalaman (0m di atas, terdalam di bawah seperti penyelaman asli!)
  gCtx.font = "600 10px Outfit, sans-serif";
  gCtx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const dVal = Math.round((maxDepth / 4) * i);
    const y = padT + (i / 4) * plotH;
    gCtx.strokeStyle = "rgba(148, 163, 184, 0.16)";
    gCtx.lineWidth = 1;
    gCtx.beginPath();
    gCtx.moveTo(padL, y);
    gCtx.lineTo(W - padR, y);
    gCtx.stroke();
    gCtx.fillStyle = "#94a3b8";
    gCtx.fillText(`${dVal}m`, padL - 6, y + 3);
  }

  // Label Ronde X-axis
  gCtx.textAlign = "center";
  for (let r = 0; r <= roundsCount; r++) {
    const x = padL + (r / Math.max(1, roundsCount)) * plotW;
    gCtx.fillStyle = "#94a3b8";
    gCtx.fillText(r === 0 ? "0" : `R${r}`, x, H - 8);
  }

  // Gambar garis menyelam masing-masing pemain
  series.forEach((s) => {
    gCtx.strokeStyle = s.color;
    gCtx.lineWidth = 2.6;
    gCtx.beginPath();
    s.pts.forEach((val, rIdx) => {
      const x = padL + (rIdx / Math.max(1, roundsCount)) * plotW;
      const y = padT + (val / maxDepth) * plotH;
      if (rIdx === 0) gCtx.moveTo(x, y);
      else gCtx.lineTo(x, y);
    });
    gCtx.stroke();

    s.pts.forEach((val, rIdx) => {
      const x = padL + (rIdx / Math.max(1, roundsCount)) * plotW;
      const y = padT + (val / maxDepth) * plotH;
      gCtx.fillStyle = s.color;
      gCtx.beginPath();
      gCtx.arc(x, y, 3.5, 0, Math.PI * 2);
      gCtx.fill();
    });
  });

  legendEl.innerHTML = series
    .map(
      (s) => `
      <div class="legend-chip">
        <span class="legend-dot" style="background:${s.color}"></span>
        <span>${s.avatar} ${escapeHtml(s.name)} (${formatMeters(s.pts[s.pts.length - 1])})</span>
      </div>
    `
    )
    .join("");
}

function renderExpeditionLog(payload) {
  const logEl = document.getElementById("gameover-expedition-log");
  if (!logEl) return;
  const history = payload.roundHistory || [];
  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";

  if (history.length === 0) {
    logEl.innerHTML = `<div class="empty-state">Log ekspedisi belum tersedia.</div>`;
    return;
  }

  logEl.innerHTML = history
    .map((rd) => {
      const mine = (rd.results || []).find((r) => r.playerId === myId);
      const best = (rd.results || [])[0];
      const leg = (rd.legendaryExamples || [])[0];
      return `
        <div class="exp-log-item">
          <div class="exp-log-head">
            <span class="exp-log-round">RONDE ${rd.round}</span>
            <strong style="font-size:0.9rem;">${escapeHtml(rd.categoryTitle)}</strong>
          </div>
          <div class="exp-log-compare">
            <span>🫵 <strong>Kamu:</strong> ${
              mine && mine.answered
                ? `${escapeHtml(mine.canonicalName)} (+${formatMeters(mine.depthGained)} ${mine.tier.emoji})`
                : "Tidak Menjawab (0m)"
            }</span>
            ${
              best && best.playerId !== myId && best.answered
                ? `<span>• 🏆 <strong>Terdalam:</strong> ${escapeHtml(best.playerName)} — ${escapeHtml(best.canonicalName)} (+${formatMeters(best.depthGained)})</span>`
                : ""
            }
          </div>
          ${
            leg
              ? `<div class="exp-log-legend">
                  🟡 <strong>Wawasan Legenda: ${escapeHtml(leg.name)} (+${formatMeters(leg.depthMeters)})</strong> — ${escapeHtml(leg.fact)}
                </div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
}

function generateSharePosterBlob(payload, me, myRank) {
  return new Promise((resolve) => {
    const pCanvas = document.createElement("canvas");
    pCanvas.width = 720;
    pCanvas.height = 900;
    const pCtx = pCanvas.getContext("2d");

    // 1. Latar Samudra Dalam
    const grad = pCtx.createLinearGradient(0, 0, 0, 900);
    grad.addColorStop(0, "#0369a1");
    grad.addColorStop(0.45, "#081c3a");
    grad.addColorStop(1, "#020617");
    pCtx.fillStyle = grad;
    pCtx.fillRect(0, 0, 720, 900);

    // Gelembung dekoratif
    for (let i = 0; i < 36; i++) {
      pCtx.beginPath();
      pCtx.arc(40 + ((i * 73) % 640), 50 + ((i * 97) % 800), 2 + (i % 5), 0, Math.PI * 2);
      pCtx.fillStyle = "rgba(186, 230, 253, 0.2)";
      pCtx.fill();
    }

    // Kartu Bingkai Utama
    pCtx.strokeStyle = "rgba(250, 204, 21, 0.55)";
    pCtx.lineWidth = 4;
    pCtx.beginPath();
    pCtx.roundRect(36, 36, 648, 828, 32);
    pCtx.stroke();

    // Header Logo
    pCtx.fillStyle = "#38bdf8";
    pCtx.font = "800 22px Outfit, sans-serif";
    pCtx.textAlign = "center";
    pCtx.fillText(
      payload.isDaily ? `PALUNG.IO • DAILY DIVE #${payload.dateKey}` : "PALUNG.IO • SELAM WAWASAN",
      360,
      95
    );

    // Gambar Kapal Selam Ikonik di Tengah Atas
    drawPalungSubmarine(
      pCtx,
      360,
      205,
      performance.now(),
      2.3,
      true,
      "#facc15",
      me.avatar,
      null,
      null,
      false,
      myRank === 1,
      2500,
      false
    );

    // Nama & Peringkat
    pCtx.fillStyle = "#ffffff";
    pCtx.font = "900 38px Outfit, sans-serif";
    pCtx.fillText(`${me.name}`, 360, 315);

    pCtx.fillStyle = myRank === 1 ? "#facc15" : "#38bdf8";
    pCtx.font = "800 24px Outfit, sans-serif";
    pCtx.fillText(`PERINGKAT #${myRank} DARI ${payload.standings.length} PENYELAM`, 360, 355);

    // Kedalaman Raksasa
    pCtx.fillStyle = "#facc15";
    pCtx.font = "900 84px Outfit, sans-serif";
    pCtx.fillText(formatMeters(me.totalDepth), 360, 465);

    // Jejak 7 Ronde (Lingkaran Warna)
    const tiers = me.historyTiers || [];
    const tierColMap = {
      "🟢": "#10b981",
      "🔵": "#38bdf8",
      "🟣": "#c084fc",
      "🟡": "#facc15",
      "💥": "#f43f5e",
      "⚫": "#475569"
    };
    const gap = 52;
    const startX = 360 - ((tiers.length - 1) * gap) / 2;
    tiers.forEach((em, idx) => {
      const cx = startX + idx * gap;
      pCtx.beginPath();
      pCtx.arc(cx, 540, 17, 0, Math.PI * 2);
      pCtx.fillStyle = tierColMap[em] || "#38bdf8";
      pCtx.fill();
      pCtx.font = "18px sans-serif";
      pCtx.fillText(em, cx, 546);
    });

    // Kotak Temuan Terlangka
    pCtx.fillStyle = "rgba(4, 15, 32, 0.85)";
    pCtx.strokeStyle = "rgba(56, 189, 248, 0.45)";
    pCtx.lineWidth = 2;
    pCtx.beginPath();
    pCtx.roundRect(76, 600, 568, 130, 20);
    pCtx.fill();
    pCtx.stroke();

    pCtx.fillStyle = "#94a3b8";
    pCtx.font = "700 18px Outfit, sans-serif";
    pCtx.fillText("💎 TEMUAN TERLANGKA", 360, 638);
    pCtx.fillStyle = "#ffffff";
    pCtx.font = "900 28px Outfit, sans-serif";
    pCtx.fillText(
      me.bestAnswer
        ? `${me.bestAnswer.answerName} (+${formatMeters(me.bestAnswer.depthGained)})`
        : "Siap menyelam lebih dalam!",
      360,
      686
    );

    // Footer CTA
    pCtx.fillStyle = "#7dd3fc";
    pCtx.font = "700 20px Outfit, sans-serif";
    pCtx.fillText("Adu wawasan langka di palung-io.onrender.com", 360, 810);

    pCanvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function handleGameOverUI(payload) {
  lastGameOverPayload = payload;
  showScreen("gameover");
  playRevealFanfare("LEGENDA", false);
  startGameOverConfetti();

  // Reset tab ke Podium & Kartu
  document.querySelectorAll(".go-tab").forEach((b) => b.classList.toggle("active", b.dataset.gotab === "podium"));
  document.getElementById("go-panel-podium").classList.remove("hidden");
  document.getElementById("go-panel-chart").classList.add("hidden");
  document.getElementById("go-panel-log").classList.add("hidden");

  const isCoop = payload.gameMode === "coop";
  document.getElementById("gameover-mode-badge").textContent = payload.isDaily
    ? `🏆 TANTANGAN HARIAN #${payload.dateKey}`
    : isCoop
    ? "🤝 EKSPEDISI TIM CO-OP SELESAI!"
    : payload.gameMode === "tide"
    ? "🌊 ARUS PASANG SELESAI!"
    : "🏁 EKSPEDISI SELESAI!";

  if (isCoop) {
    document.getElementById("gameover-headline").textContent = `Total Kedalaman Tim: ${formatMeters(payload.teamTotalDepth)}!`;
  } else {
    const winner = payload.standings[0];
    document.getElementById("gameover-headline").textContent = winner
      ? `👑 ${winner.avatar} ${winner.name} Menjuarai Palung (${formatMeters(winner.totalDepth)})!`
      : "Ekspedisi Selesai!";
  }

  // 1. Render Podium 3 Slot (#1, #2, #3) + Runners (#4+)
  const top3 = payload.standings.slice(0, 3);
  const runners = payload.standings.slice(3);
  const podiumEl = document.getElementById("gameover-podium");
  podiumEl.innerHTML = top3
    .map((p, idx) => {
      const rank = idx + 1;
      return `
        <div class="podium-slot slot-${rank}">
          <div>
            <div class="podium-crown">${rank === 1 ? "👑" : rank === 2 ? "🥈" : "🥉"}</div>
            <div style="font-size:0.74rem;font-weight:900;color:${rank === 1 ? "#facc15" : "#38bdf8"};">JUARA #${rank}</div>
            <div class="podium-avatar-big">${p.avatar}</div>
            <strong style="font-size:1.05rem;display:block;">${escapeHtml(p.name)}</strong>
          </div>
          <div>
            <div class="podium-depth-big">${formatMeters(p.totalDepth)}</div>
            <div class="podium-tiers-row">${(p.historyTiers || []).join("")}</div>
            ${
              p.bestAnswer
                ? `<div class="podium-best-pill">💎 ${escapeHtml(p.bestAnswer.answerName)} (+${formatMeters(p.bestAnswer.depthGained)})</div>`
                : ""
            }
          </div>
        </div>
      `;
    })
    .join("");

  const runnersEl = document.getElementById("gameover-runners");
  if (runnersEl) {
    runnersEl.innerHTML = runners
      .map(
        (p, idx) => `
        <div class="runner-pill">
          <strong style="color:#94a3b8;">#${idx + 4}</strong>
          <span>${p.avatar}</span>
          <strong>${escapeHtml(p.name)}</strong>
          <span style="color:#38bdf8;font-weight:800;">${formatMeters(p.totalDepth)}</span>
          <span>${(p.historyTiers || []).join("")}</span>
        </div>
      `
      )
      .join("");
  }

  // 2. Render Party Awards
  const awardsEl = document.getElementById("gameover-awards");
  if (awardsEl) {
    const awards = computePartyAwards(payload.standings);
    awardsEl.innerHTML = awards
      .map(
        (a) => `
        <div class="award-card">
          <span class="award-icon">${a.icon}</span>
          <div class="award-info">
            <strong>${escapeHtml(a.title)}</strong>
            <span>${escapeHtml(a.winner)}</span>
            <small>${escapeHtml(a.desc)}</small>
          </div>
        </div>
      `
      )
      .join("");
  }

  // 3. Render Log 7 Ronde
  renderExpeditionLog(payload);

  // 4. Teks Shareable
  const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
  const meIdx = payload.standings.findIndex((p) => p.id === myId);
  const me = meIdx >= 0 ? payload.standings[meIdx] : payload.standings[0];
  if (me) {
    const shareLines = [
      `🌊 PALUNG.IO — ${payload.isDaily ? `Daily Dive #${payload.dateKey}` : "Selam Wawasan"}`,
      `${me.avatar} Penyelam: ${me.name} (Peringkat #${meIdx >= 0 ? meIdx + 1 : 1})`,
      `⚓ Kedalaman Akhir: ${formatMeters(me.totalDepth)}`,
      `📊 Jejak Selam: ${(me.historyTiers || []).join("")}`,
      me.bestAnswer
        ? `💎 Temuan Terlangka: ${me.bestAnswer.answerName} (+${formatMeters(me.bestAnswer.depthGained)})`
        : `💎 Siap menyelam lebih dalam!`,
      `Main gratis di https://palung-io.onrender.com`
    ];
    document.getElementById("share-text-box").textContent = shareLines.join("\n");
  }
}

// Switch Tab di Game Over
document.querySelectorAll(".go-tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.gotab;
    document.querySelectorAll(".go-tab").forEach((b) => b.classList.toggle("active", b === btn));
    document.getElementById("go-panel-podium").classList.toggle("hidden", target !== "podium");
    document.getElementById("go-panel-chart").classList.toggle("hidden", target !== "chart");
    document.getElementById("go-panel-log").classList.toggle("hidden", target !== "log");
    if (target === "chart" && lastGameOverPayload) {
      setTimeout(() => renderDiveProfileChart(lastGameOverPayload), 40);
    }
  });
});

// Download / Bagikan Poster PNG Kartu Selam
const btnDownloadPoster = document.getElementById("btn-download-poster");
if (btnDownloadPoster) {
  btnDownloadPoster.addEventListener("click", async () => {
    if (!lastGameOverPayload) return;
    const myId = isLocalOfflineGame ? "me" : socket ? socket.id : "me";
    const meIdx = lastGameOverPayload.standings.findIndex((p) => p.id === myId);
    const me = meIdx >= 0 ? lastGameOverPayload.standings[meIdx] : lastGameOverPayload.standings[0];
    const rank = meIdx >= 0 ? meIdx + 1 : 1;

    btnDownloadPoster.disabled = true;
    btnDownloadPoster.textContent = "⏳ Membuat Gambar...";
    try {
      const blob = await generateSharePosterBlob(lastGameOverPayload, me, rank);
      if (blob) {
        const file = new File([blob], "PALUNG-IO-Rekor.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Rekor Selam PALUNG.IO",
            text: `Saya mencapai kedalaman ${formatMeters(me.totalDepth)} di PALUNG.IO!`,
            files: [file]
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "PALUNG-IO-Rekor.png";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          showToast("📸 Poster Kartu Selam berhasil diunduh!");
        }
      }
    } catch (e) {
      showToast("📸 Poster siap dibagikan!");
    } finally {
      btnDownloadPoster.disabled = false;
      btnDownloadPoster.textContent = "📸 Simpan Gambar Kartu";
    }
  });
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

const btnWsAiGenerate = document.getElementById("btn-ws-ai-generate");
if (btnWsAiGenerate) {
  btnWsAiGenerate.addEventListener("click", async () => {
    const topic = document.getElementById("ws-title").value.trim();
    const theme = document.getElementById("ws-theme").value;
    if (!topic) {
      showToast("⚠️ Ketik Judul / Topik kategori di atas terlebih dahulu!");
      document.getElementById("ws-title").focus();
      return;
    }
    const origText = btnWsAiGenerate.textContent;
    btnWsAiGenerate.disabled = true;
    btnWsAiGenerate.textContent = "⏳ Meracik AI...";
    try {
      const res = await fetch(`${apiBaseUrl}/api/ai/generate-category`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, theme })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(`❌ ${data.error || "Gagal generate kategori AI"}`);
        return;
      }
      document.getElementById("ws-title").value = data.title || topic;
      if (data.hint) document.getElementById("ws-hint").value = data.hint;
      document.getElementById("ws-answers").value = (data.answers || [])
        .map((a) => `${a.name} | ${a.score} | ${a.fact}`)
        .join("\n");
      playDiveLock();
      showToast(`✨ ${data.answers.length} jawaban dibuat otomatis oleh ${data.modelUsed}!`);
    } catch (err) {
      showToast("❌ Gagal menghubungi server AI.");
    } finally {
      btnWsAiGenerate.disabled = false;
      btnWsAiGenerate.textContent = origText;
    }
  });
}

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
