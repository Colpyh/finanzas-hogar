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

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", encodePng(render(192, 0.22), 192));
writeFileSync("public/icons/icon-512.png", encodePng(render(512, 0.22), 512));
writeFileSync("public/icons/icon-512-maskable.png", encodePng(render(512, 0), 512));
writeFileSync("src/app/apple-icon.png", encodePng(render(180, 0), 180));
console.log("Íconos generados: public/icons/* + src/app/apple-icon.png");
