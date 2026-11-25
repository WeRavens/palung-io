// ============================================================================
// PROGRES PENYELAM: Pangkat, XP & Misi Harian (tersimpan di perangkat)
// Dimuat setelah app.js. Membungkus handleGameOverUI untuk mencatat hasil game.
// Murni kosmetik: tidak memengaruhi skor atau keseimbangan permainan.
// ============================================================================
(function () {
  const KEY = "palung_progress_v1";

  const RANKS = [
    { xp: 0, emoji: "🛶", title: "Perahu Nelayan" },
    { xp: 150, emoji: "⛵", title: "Penyelam Pemula" },
    { xp: 400, emoji: "🚤", title: "Penjelajah Karang" },
    { xp: 800, emoji: "🛥️", title: "Pemburu Arus" },
    { xp: 1400, emoji: "🚢", title: "Penyelam Abisal" },
    { xp: 2200, emoji: "🤿", title: "Kapten Palung" },
    { xp: 3500, emoji: "🐋", title: "Legenda Mariana" }
  ];

  const MISSION_POOL = [
    { id: "games2", text: "Selesaikan 2 game", goal: 2, stat: "games", xp: 80 },
    { id: "rare3", text: "Temukan 3 jawaban Abisal atau lebih langka", goal: 3, stat: "rare", xp: 120 },
    { id: "legend1", text: "Dapatkan 1 jawaban Legenda Palung", goal: 1, stat: "legend", xp: 150 },
    { id: "depth4k", text: "Capai 4.000m dalam satu game", goal: 4000, stat: "bestDepth", xp: 120, max: true },
    { id: "clean", text: "Selesaikan game tanpa tabrakan jawaban", goal: 1, stat: "cleanGames", xp: 100 },
    { id: "daily", text: "Mainkan Tantangan Harian", goal: 1, stat: "dailyGames", xp: 100 },
    { id: "rare6", text: "Temukan 6 jawaban Abisal atau lebih langka", goal: 6, stat: "rare", xp: 200 }
  ];

  function todayKey() {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function seeded(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return function () {
      h += 0x6d2b79f5;
      let t = h;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pickMissions(dateKey) {
    const rnd = seeded("palung-misi-" + dateKey);
    const pool = [...MISSION_POOL];
    const out = [];
    while (out.length < 3 && pool.length) {
      const i = Math.floor(rnd() * pool.length);
      out.push(pool.splice(i, 1)[0].id);
    }
    return out;
  }

  function load() {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch (e) {
      data = {};
    }
    data.xp = Number(data.xp) || 0;
    data.games = Number(data.games) || 0;
    data.bestDepth = Number(data.bestDepth) || 0;
    data.legendTotal = Number(data.legendTotal) || 0;
    const key = todayKey();
    if (!data.day || data.day.key !== key) {
      data.day = {
        key,
        stats: { games: 0, rare: 0, legend: 0, bestDepth: 0, cleanGames: 0, dailyGames: 0 },
        done: []
      };
    }
    return data;
  }

  function save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function rankIndex(xp) {
    let idx = 0;
    RANKS.forEach((r, i) => {
      if (xp >= r.xp) idx = i;
    });
    return idx;
  }

  function toast(msg) {
    if (typeof showToast === "function") showToast(msg);
  }

  function recordGame(me, payload) {
    const data = load();
    const tiers = (me.historyTiers || []).join("");
    const rare = (tiers.match(/🟣|🟡/gu) || []).length;
    const legend = (tiers.match(/🟡/gu) || []).length;
    const depth = Number(me.totalDepth) || 0;
    const clean = (me.collisionsCount || 0) === 0 && tiers.indexOf("⚫") === -1;

    const before = rankIndex(data.xp);
    let gained = 20 + Math.round(depth / 100) + rare * 10 + legend * 20;

    const s = data.day.stats;
    s.games += 1;
    s.rare += rare;
    s.legend += legend;
    s.bestDepth = Math.max(s.bestDepth, depth);
    if (clean) s.cleanGames += 1;
    if (payload && payload.isDaily) s.dailyGames += 1;

    data.games += 1;
    data.bestDepth = Math.max(data.bestDepth, depth);
    data.legendTotal += legend;

    const finished = [];
    pickMissions(data.day.key).forEach((id) => {
      const m = MISSION_POOL.find((x) => x.id === id);
      if (m && !data.day.done.includes(id) && s[m.stat] >= m.goal) {
        data.day.done.push(id);
        gained += m.xp;
        finished.push(m);
      }
    });

    data.xp += gained;
    save(data);

    const after = rankIndex(data.xp);
    setTimeout(() => {
      toast(`⭐ +${gained} XP${finished.length ? ` • Misi selesai: ${finished.map((m) => m.text).join(", ")}` : ""}`);
      if (after > before) {
        toast(`🎉 Naik pangkat: ${RANKS[after].emoji} ${RANKS[after].title}!`);
      }
    }, 900);
    renderCard();
    return RANKS[after];
  }

  function ensureCard() {
    let card = document.getElementById("progress-card");
    if (card) return card;
    const slot = document.getElementById("captain-progress-slot");
    if (slot) {
      card = document.createElement("div");
      card.id = "progress-card";
      card.className = "progress-card";
      slot.appendChild(card);
      return card;
    }
    const anchor = document.querySelector("#screen-home .hero-cta");
    if (!anchor) return null;
    card = document.createElement("div");
    card.id = "progress-card";
    card.className = "progress-card";
    anchor.insertAdjacentElement("afterend", card);
    return card;
  }

  function renderCard() {
    const card = ensureCard();
    if (!card) return;
    const data = load();
    const idx = rankIndex(data.xp);
    const rank = RANKS[idx];
    const next = RANKS[idx + 1];
    const pct = next ? Math.round(((data.xp - rank.xp) / (next.xp - rank.xp)) * 100) : 100;
    const missions = pickMissions(data.day.key).map((id) => MISSION_POOL.find((m) => m.id === id));

    const rows = missions
      .map((m) => {
        const val = Math.min(m.goal, data.day.stats[m.stat] || 0);
        const done = data.day.done.includes(m.id);
        const label = m.goal >= 1000 ? `${val.toLocaleString("id-ID")}/${m.goal.toLocaleString("id-ID")}` : `${val}/${m.goal}`;
        return `<li class="${done ? "done" : ""}"><span>${done ? "✅" : "🎯"} ${m.text}</span><em>${done ? "+" + m.xp + " XP" : label}</em></li>`;
      })
      .join("");

    const wasOpen = card.querySelector("details") ? card.querySelector("details").open : false;
    const doneCount = data.day.done.length;
    card.innerHTML = `
      <details class="pc-details"${wasOpen ? " open" : ""}>
      <summary class="pc-summary"><span class="pc-emoji">${rank.emoji}</span><span class="pc-sum-text"><strong>${rank.title}</strong><small>${data.xp} XP • Misi harian ${doneCount}/3</small></span><span class="pc-chevron">▾</span></summary>
      <div class="pc-head">
        <small class="pc-next">${data.games} game • rekor ${data.bestDepth.toLocaleString("id-ID")}m • ${next ? `Berikutnya: ${next.emoji} ${next.title}` : "Pangkat tertinggi!"}</small>
      </div>
      <div class="pc-track"><div class="pc-bar" style="width:${pct}%"></div></div>
      <div class="pc-missions-title">Misi Harian</div>
      <ul class="pc-missions">${rows}</ul>
      </details>`;
  }

  // Bungkus handleGameOverUI (fungsi global dari app.js)
  if (typeof window.handleGameOverUI === "function") {
    const original = window.handleGameOverUI;
    window.handleGameOverUI = function (payload) {
      original.apply(this, arguments);
      try {
        const myId = typeof isLocalOfflineGame !== "undefined" && isLocalOfflineGame ? "me" : typeof socket !== "undefined" && socket ? socket.id : "me";
        const me = (payload.standings || []).find((p) => p.id === myId) || (payload.standings || [])[0];
        if (!me) return;
        const rank = recordGame(me, payload);
        const box = document.getElementById("share-text-box");
        if (box && rank) box.textContent = box.textContent.replace(/(Penyelam: [^\n]*)/, `$1 (${rank.emoji} ${rank.title})`);
      } catch (e) {
        console.warn("Progres gagal dicatat:", e);
      }
    };
  }

  renderCard();
})();
