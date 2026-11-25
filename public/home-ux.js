// Penyempurnaan UX Beranda: Avatar drawer, Cara Main toggle, Enter-to-Join, Live Room Count & Quick Tools.
(function () {
  // 1. Toggle "Cara Main" ringkas di Hero
  const btnHowto = document.getElementById("btn-toggle-howto");
  const howtoPanel = document.getElementById("howto-panel");
  if (btnHowto && howtoPanel) {
    btnHowto.addEventListener("click", () => {
      const hidden = howtoPanel.classList.toggle("hidden");
      btnHowto.setAttribute("aria-expanded", String(!hidden));
      btnHowto.classList.toggle("active", !hidden);
    });
  }

  // 2. Identity & Avatar Drawer (1-tap pilih maskot di dalam Captain Dock)
  const avatarTrigger = document.getElementById("btn-avatar-trigger");
  const avatarPreview = document.getElementById("captain-avatar-preview");
  const avatarDrawer = document.getElementById("avatar-drawer");
  const avatarsGrid = document.getElementById("avatar-selector");

  function syncAvatarPreview() {
    if (!avatarPreview || !avatarsGrid) return;
    const sel = avatarsGrid.querySelector(".avatar-btn.selected");
    avatarPreview.textContent = sel ? sel.dataset.avatar : "🤿";
  }

  if (avatarTrigger && avatarDrawer) {
    avatarTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      avatarDrawer.classList.toggle("hidden");
      avatarTrigger.classList.toggle("open", !avatarDrawer.classList.contains("hidden"));
    });

    if (avatarsGrid) {
      avatarsGrid.addEventListener("click", (e) => {
        const btn = e.target.closest(".avatar-btn");
        if (!btn) return;
        setTimeout(() => {
          syncAvatarPreview();
          avatarDrawer.classList.add("hidden");
          avatarTrigger.classList.remove("open");
        }, 0);
      });
    }

    document.addEventListener("click", (e) => {
      if (
        !avatarDrawer.classList.contains("hidden") &&
        !avatarDrawer.contains(e.target) &&
        !avatarTrigger.contains(e.target)
      ) {
        avatarDrawer.classList.add("hidden");
        avatarTrigger.classList.remove("open");
      }
    });
  }
  setTimeout(syncAvatarPreview, 0);
  setTimeout(syncAvatarPreview, 500);

  // 3. Kode Room: otomatis huruf kapital & Enter langsung Gabung
  const roomInput = document.getElementById("input-room-code");
  const joinBtn = document.getElementById("btn-join-room");
  if (roomInput) {
    roomInput.addEventListener("input", () => {
      const cleaned = roomInput.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (roomInput.value !== cleaned) roomInput.value = cleaned;
    });
    roomInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && joinBtn) {
        e.preventDefault();
        joinBtn.click();
      }
    });
  }

  // 4. Hitung & tampilkan jumlah Room Terbuka secara real-time di Badge Tab + Pintasan Mabar
  const publicRoomsList = document.getElementById("public-rooms-list");
  const tabCountBadge = document.getElementById("open-rooms-tab-count");
  const quickRoomsPill = document.getElementById("quick-open-rooms-pill");
  const quickRoomsNum = document.getElementById("quick-open-rooms-num");
  const communityCard = document.getElementById("community-card");
  const publicRoomsTabBtn = document.querySelector('.tab-btn[data-tab="tab-public-rooms"]');

  function syncOpenRoomsBadge() {
    if (!publicRoomsList) return;
    const count = publicRoomsList.querySelectorAll(".lb-item").length;
    if (tabCountBadge) {
      tabCountBadge.textContent = String(count);
      tabCountBadge.classList.toggle("has-rooms", count > 0);
    }
    if (quickRoomsPill && quickRoomsNum) {
      quickRoomsNum.textContent = String(count);
      quickRoomsPill.classList.toggle("hidden", count === 0);
    }
  }

  if (publicRoomsList) {
    const obs = new MutationObserver(syncOpenRoomsBadge);
    obs.observe(publicRoomsList, { childList: true, subtree: true });
    syncOpenRoomsBadge();
  }

  if (quickRoomsPill && communityCard) {
    quickRoomsPill.addEventListener("click", () => {
      if (publicRoomsTabBtn) publicRoomsTabBtn.click();
      communityCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // 5. Hubungkan Kartu Alat Cepat & Bottom Nav "Room & Top"
  const utilWorkshop = document.getElementById("btn-home-util-workshop");
  const topWorkshop = document.getElementById("btn-open-workshop");
  if (utilWorkshop && topWorkshop) {
    utilWorkshop.addEventListener("click", () => topWorkshop.click());
  }

  const utilMobile = document.getElementById("btn-home-util-mobile");
  const topMobile = document.getElementById("btn-open-mobile-hub");
  if (utilMobile && topMobile) {
    utilMobile.addEventListener("click", () => topMobile.click());
  }

  const navRooms = document.querySelector('.mnav-item[data-action="rooms"]');
  if (navRooms && communityCard) {
    navRooms.addEventListener("click", () => {
      document.querySelectorAll(".mnav-item").forEach((b) => b.classList.remove("active"));
      navRooms.classList.add("active");
      if (publicRoomsTabBtn) publicRoomsTabBtn.click();
      communityCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const navHome = document.querySelector('.mnav-item[data-action="home"]');
  if (navHome) {
    navHome.addEventListener("click", () => {
      document.querySelectorAll(".mnav-item").forEach((b) => b.classList.remove("active"));
      navHome.classList.add("active");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
