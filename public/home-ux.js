// Penyempurnaan UX beranda: tombol utama, ringkasan profil, panel lipat.
(function () {
  const play = document.getElementById("btn-hero-play");
  const quick = document.getElementById("btn-quick-match");
  if (play && quick) play.addEventListener("click", () => quick.click());

  const details = document.getElementById("profile-details");
  const summaryText = document.getElementById("profile-summary-text");
  const nameInput = document.getElementById("input-player-name");
  const avatars = document.getElementById("avatar-selector");

  function syncProfile() {
    if (!summaryText || !nameInput) return;
    const sel = avatars && avatars.querySelector(".avatar-btn.selected");
    const avatar = sel ? sel.dataset.avatar : "🤿";
    summaryText.textContent = avatar + " " + (nameInput.value.trim() || "Kapten Samudra");
  }

  // Terbuka di layar lebar, terlipat di HP agar tombol main lebih dekat
  if (details && window.matchMedia("(min-width: 1121px)").matches) details.open = true;

  if (nameInput) nameInput.addEventListener("input", syncProfile);
  if (avatars) avatars.addEventListener("click", () => setTimeout(syncProfile, 0));
  setTimeout(syncProfile, 0);
  setTimeout(syncProfile, 600);
})();
