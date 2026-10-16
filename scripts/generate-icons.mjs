// Genera los íconos PWA en public/ a partir de un SVG de marca.
// Uso: npm run icons
import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");
mkdirSync(publicDir, { recursive: true });

// Tijeras doradas sobre fondo oscuro de la marca (sin fuentes -> siempre renderiza)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#121614"/>
  <g transform="translate(256 256) scale(0.78) translate(-256 -256)">
    <line x1="170" y1="400" x2="330" y2="120" stroke="#B39A6A" stroke-width="34" stroke-linecap="round"/>
    <line x1="342" y1="400" x2="182" y2="120" stroke="#B39A6A" stroke-width="34" stroke-linecap="round"/>
    <circle cx="170" cy="400" r="46" fill="none" stroke="#B39A6A" stroke-width="30"/>
    <circle cx="342" cy="400" r="46" fill="none" stroke="#B39A6A" stroke-width="30"/>
    <circle cx="256" cy="250" r="22" fill="#121614" stroke="#B39A6A" stroke-width="20"/>
  </g>
</svg>`;

writeFileSync(resolve(publicDir, "favicon.svg"), svg);

const targets = [
  ["pwa-192.png", 192],
  ["pwa-512.png", 512],
  ["maskable-512.png", 512],
  ["apple-touch-icon.png", 180],
];

for (const [name, size] of targets) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(resolve(publicDir, name));
  console.log(`✓ public/${name}`);
}

console.log("Íconos generados en frontend/public/");
