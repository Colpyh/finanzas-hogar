/**
 * Genera los íconos PWA (PNG) sin dependencias externas: casita blanca sobre
 * violeta #7c3aed, imitando el logo del login. Ejecutar desde la raíz:
 *   node scripts/generate-icons.mjs
 *
 * Salidas:
 *   public/icons/icon-192.png       (esquinas redondeadas, transparente)
 *   public/icons/icon-512.png      (esquinas redondeadas, transparente)
 *   public/icons/icon-512-maskable.png (full-bleed, para máscaras Android)
 *   src/app/apple-icon.png         (180x180 full-bleed — iOS redondea solo)
 */
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const VIOLET = [124, 58, 237];
const WHITE = [255, 255, 255];

// ¿El punto (x,y) en [0,1]² cae dentro del rect redondeado de radio r?
function inRoundRect(x, y, r) {
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  const cx = x < r ? r : x > 1 - r ? 1 - r : x;
  const cy = y < r ? r : y > 1 - r ? 1 - r : y;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r ** 2;
}

// Casita: techo triangular + cuerpo + puerta (en coordenadas [0,1]²)
function houseColor(x, y) {
  // techo: triángulo con vértice (0.5, 0.24), base y=0.52 de x=0.22 a 0.78
  if (y >= 0.24 && y <= 0.52) {
    const t = (y - 0.24) / (0.52 - 0.24);
    const half = 0.02 + t * 0.26;
    if (Math.abs(x - 0.5) <= half) return WHITE;
  }
  // cuerpo: rect x 0.30–0.70, y 0.50–0.76
  if (x >= 0.3 && x <= 0.7 && y >= 0.5 && y <= 0.76) {
    // puerta: rect x 0.44–0.56, y 0.60–0.76 (se ve violeta)
    if (x >= 0.44 && x <= 0.56 && y >= 0.6) return VIOLET;
    return WHITE;
  }
  return null;
}

/** Renderiza el ícono con supersampling 4x. radius=0 → full-bleed. */
function render(size, radius) {
  const SS = 4;
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          if (!inRoundRect(u, v, radius)) continue;
          const c = houseColor(u, v) ?? VIOLET;
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const i = (y * size + x) * 4;
      // color premultiplicado promedio sobre las muestras cubiertas
      const cov = a / 255;
      px[i] = cov ? Math.round(r / cov) : 0;
      px[i + 1] = cov ? Math.round(g / cov) : 0;
      px[i + 2] = cov ? Math.round(b / cov) : 0;
      px[i + 3] = Math.round(a / n);
    }
  }
  return px;
}

// --- Codificación PNG mínima (RGBA 8-bit) ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  // scanlines con filtro 0
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Splash screens de iOS (apple-touch-startup-image) ---
// Fondo oscuro + ícono violeta redondeado centrado. iOS las muestra AL
// INSTANTE al abrir la PWA, antes de cualquier red — tapa el cold start.
const SPLASH_BG = [22, 18, 31]; // #16121f (background dark de la app)

function encodePngRect(px, w, h) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) {
    px.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function renderSplash(w, h) {
  const SS = 2;
  const iconSize = Math.round(w * 0.3); // ícono ~30% del ancho
  const ix0 = (w - iconSize) / 2;
  const iy0 = (h - iconSize) / 2;
  const px = Buffer.alloc(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      // Fuera de la zona del ícono: fondo directo (rápido)
      if (x < ix0 - 1 || x > ix0 + iconSize || y < iy0 - 1 || y > iy0 + iconSize) {
        px[i] = SPLASH_BG[0]; px[i + 1] = SPLASH_BG[1]; px[i + 2] = SPLASH_BG[2]; px[i + 3] = 255;
        continue;
      }
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS - ix0) / iconSize;
          const v = (y + (sy + 0.5) / SS - iy0) / iconSize;
          let c = SPLASH_BG;
          if (inRoundRect(u, v, 0.22)) c = houseColor(u, v) ?? VIOLET;
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      px[i] = Math.round(r / n); px[i + 1] = Math.round(g / n); px[i + 2] = Math.round(b / n); px[i + 3] = 255;
    }
  }
  return encodePngRect(px, w, h);
}

// Resoluciones de iPhone (portrait, px reales). Cubre SE→16 Pro Max.
const SPLASH_SIZES = [
  [750, 1334], [828, 1792], [1125, 2436], [1170, 2532], [1179, 2556],
  [1206, 2622], [1242, 2688], [1284, 2778], [1290, 2796], [1320, 2868],
];

mkdirSync("public/icons", { recursive: true });
mkdirSync("public/splash", { recursive: true });
writeFileSync("public/icons/icon-192.png", encodePng(render(192, 0.22), 192));
writeFileSync("public/icons/icon-512.png", encodePng(render(512, 0.22), 512));
writeFileSync("public/icons/icon-512-maskable.png", encodePng(render(512, 0), 512));
writeFileSync("src/app/apple-icon.png", encodePng(render(180, 0), 180));
for (const [w, h] of SPLASH_SIZES) {
  writeFileSync(`public/splash/splash-${w}x${h}.png`, renderSplash(w, h));
}
console.log("Íconos + splash generados: public/icons/*, public/splash/*, src/app/apple-icon.png");
