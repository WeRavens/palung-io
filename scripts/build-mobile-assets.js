// Script untuk memaketkan Database Kategori ke Mobile Bundle (Offline-First)
// dan membuat Ikon PNG Aplikasi (192x192 & 512x512) untuk PWA & Google Play Store.

const fs = require("fs");
const path = require("path");
const os = require("os");
const zlib = require("zlib");
const { CATEGORIES } = require("../data/categories");

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

const publicDir = path.join(__dirname, "..", "public");
const iconsDir = path.join(publicDir, "icons");

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const detectedLanServer = "https://palung-io.onrender.com";

// 1. Tulis public/categories-bundle.js agar aplikasi mobile bekerja 100% Offline di HP
// sekaligus otomatis tersambung ke server online Render untuk Multiplayer di APK!
const bundleContent = `// AUTO-GENERATED MOBILE OFFLINE DATABASE BUNDLE
window.PALUNG_DEFAULT_SERVER = ${JSON.stringify(detectedLanServer)};
window.PALUNG_CATEGORIES = ${JSON.stringify(CATEGORIES, null, 2)};
`;
fs.writeFileSync(path.join(publicDir, "categories-bundle.js"), bundleContent, "utf8");
console.log(`✅ Berhasil memaketkan ${CATEGORIES.length} kategori ke public/categories-bundle.js (Default Server: ${detectedLanServer})`);

// 2. Buat SVG Icon Berkualitas Tinggi
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="ocean" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0284c7"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="sub" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="115" fill="url(#ocean)"/>
  <circle cx="256" cy="256" r="195" fill="none" stroke="#38bdf8" stroke-width="6" stroke-dasharray="18 14" opacity="0.45"/>
  <circle cx="256" cy="256" r="140" fill="none" stroke="#10b981" stroke-width="4" opacity="0.35"/>
  <!-- Periskop -->
  <path d="M256 125 L256 185 M256 125 L295 125" stroke="#facc15" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <!-- Badan Kapal Selam -->
  <rect x="130" y="185" width="252" height="130" rx="65" fill="url(#sub)"/>
  <!-- Jendela Kaca Kapal Selam -->
  <circle cx="220" cy="250" r="32" fill="#0284c7" stroke="#0f172a" stroke-width="10"/>
  <circle cx="305" cy="250" r="22" fill="#38bdf8" stroke="#0f172a" stroke-width="8"/>
  <!-- Baling-Baling -->
  <path d="M110 220 L130 250 L110 280 Z" fill="#f43f5e"/>
  <!-- Gelembung -->
  <circle cx="385" cy="165" r="14" fill="#7dd3fc" opacity="0.8"/>
  <circle cx="415" cy="130" r="9" fill="#7dd3fc" opacity="0.6"/>
  <text x="256" y="425" font-family="Arial, sans-serif" font-weight="900" font-size="56" fill="#ffffff" text-anchor="middle" letter-spacing="3">PALUNG.IO</text>
</svg>`;

fs.writeFileSync(path.join(iconsDir, "icon.svg"), svgIcon, "utf8");

// 3. Generator PNG Murni (Tanpa dependency C++ eksternal) untuk icon-192.png & icon-512.png
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ crcTable[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  const combined = Buffer.concat([typeBuf, data]);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([len, combined, crcBuf]);
}

function generateSubmarinePng(size) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (size * 4 + 1);
    raw[rowStart] = 0; // Filter type 0
    const t = y / size;

    // Gradasi Samudra Dalam
    let bgR = Math.round(4 + (1 - t) * 10);
    let bgG = Math.round(13 + (1 - t) * 75);
    let bgB = Math.round(26 + (1 - t) * 145);

    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      const dx = (x - cx) / (size / 2);
      const dy = (y - cy) / (size / 2);
      const dist = Math.sqrt(dx * dx + dy * dy);

      let r = bgR;
      let g = bgG;
      let b = bgB;

      // Cincin Radar Sonar
      if (Math.abs(dist - 0.76) < 0.018 || Math.abs(dist - 0.55) < 0.014) {
        r = 56;
        g = 189;
        b = 248;
      }

      // Badan Kapal Selam Kuning Emas di Tengah
      const subRx = 0.44;
      const subRy = 0.23;
      const sdist = (dx * dx) / (subRx * subRx) + (dy * dy) / (subRy * subRy);
      if (sdist <= 1.0) {
        r = 250;
        g = 204;
        b = 21;
        // Jendela Kaca Kapal Selam
        const wx = dx + 0.1;
        const wy = dy;
        const wdist = Math.sqrt(wx * wx + wy * wy);
        if (wdist < 0.11) {
          r = 56;
          g = 189;
          b = 248;
        } else if (wdist < 0.145) {
          r = 15;
          g = 23;
          b = 42;
        }
      }

      // Menara Periskop Kapal Selam
      if (Math.abs(dx) < 0.055 && dy < -0.18 && dy > -0.44) {
        r = 245;
        g = 158;
        b = 11;
      }
      if (dx >= 0 && dx < 0.16 && Math.abs(dy + 0.42) < 0.04) {
        r = 245;
        g = 158;
        b = 11;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", idat),
    makeChunk("IEND", Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(iconsDir, "icon-192.png"), generateSubmarinePng(192));
fs.writeFileSync(path.join(iconsDir, "icon-512.png"), generateSubmarinePng(512));
console.log("✅ Berhasil membuat ikon aplikasi PNG (icon-192.png & icon-512.png)");

// 4. Salin socket.io client agar tersedia di dalam APK Android Offline
const socketClientSrc = path.join(
  __dirname,
  "..",
  "node_modules",
  "socket.io",
  "client-dist",
  "socket.io.min.js"
);
const socketClientDestDir = path.join(publicDir, "socket.io");
if (fs.existsSync(socketClientSrc)) {
  if (!fs.existsSync(socketClientDestDir)) {
    fs.mkdirSync(socketClientDestDir, { recursive: true });
  }
  fs.copyFileSync(socketClientSrc, path.join(socketClientDestDir, "socket.io.js"));
  console.log("✅ Berhasil menyalin socket.io.js untuk paket APK Android Offline");
}

// 5. Pasang Ikon Kapal Selam PALUNG.IO ke folder Android Mipmap (Jika proyek android/ sudah ada)
const androidResDir = path.join(__dirname, "..", "android", "app", "src", "main", "res");
if (fs.existsSync(androidResDir)) {
  const mipmaps = [
    { dir: "mipmap-mdpi", size: 48 },
    { dir: "mipmap-hdpi", size: 72 },
    { dir: "mipmap-xhdpi", size: 96 },
    { dir: "mipmap-xxhdpi", size: 144 },
    { dir: "mipmap-xxxhdpi", size: 192 }
  ];
  mipmaps.forEach(({ dir, size }) => {
    const targetDir = path.join(androidResDir, dir);
    if (fs.existsSync(targetDir)) {
      const pngBuf = generateSubmarinePng(size);
      fs.writeFileSync(path.join(targetDir, "ic_launcher.png"), pngBuf);
      fs.writeFileSync(path.join(targetDir, "ic_launcher_round.png"), pngBuf);
      fs.writeFileSync(path.join(targetDir, "ic_launcher_foreground.png"), pngBuf);
    }
  });
  console.log("✅ Berhasil memasang ikon Kapal Selam PALUNG.IO ke Android res/mipmap-*");
}
