import { mkdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(SCRIPT_DIR, '..');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'resources');

// Brand tokens from favicon.svg and DESIGN.md
const COLORS = {
  toriiRed: '#D33827',
  sealStart: '#E14332',
  sealEnd: '#C22F20',
  washiPaper: '#FAF8F5',
  sumiCanvas: '#121316',
  white: '#FFFFFF',
};

// Geometric 日 (Nichi) glyph path on 64x64 viewBox from favicon.svg
// Bounds: x=14.5..49.5 (w=35, 54.7%), y=15..49 (h=34, 53.1%), centered at (32, 32)
const KANJI_NICHI_PATH =
  'M 17 15 C 15.6 15 14.5 16.1 14.5 17.5 L 14.5 46.5 C 14.5 47.9 15.6 49 17 49 ' +
  'L 47 49 C 48.4 49 49.5 47.9 49.5 46.5 L 49.5 17.5 C 49.5 16.1 48.4 15 47 15 Z ' +
  'M 20.5 21 L 43.5 21 L 43.5 29 L 20.5 29 Z ' +
  'M 20.5 35 L 43.5 35 L 43.5 43 L 20.5 43 Z';

const SEAL_GRADIENT_DEFS = `
  <defs>
    <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${COLORS.sealStart}" />
      <stop offset="100%" stop-color="${COLORS.sealEnd}" />
    </linearGradient>
  </defs>
`;

function createIconOnlySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
  ${SEAL_GRADIENT_DEFS}
  <rect width="64" height="64" fill="url(#sealGrad)" />
  <rect x="2.5" y="2.5" width="59" height="59" rx="12.5" fill="none" stroke="${COLORS.white}" stroke-opacity="0.25" stroke-width="1.5" />
  <path fill="${COLORS.white}" fill-rule="evenodd" d="${KANJI_NICHI_PATH}" />
</svg>`;
}

function createIconForegroundSvg() {
  // 64x64 scaled 16x -> 1024x1024: glyph is 560x544 px (54.7% x 53.1%), centered inside the 66% safe zone.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="1024" height="1024">
  <path fill="${COLORS.white}" fill-rule="evenodd" d="${KANJI_NICHI_PATH}" />
</svg>`;
}

function createIconBackgroundSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  ${SEAL_GRADIENT_DEFS}
  <rect width="1024" height="1024" fill="url(#sealGrad)" />
</svg>`;
}

function createSplashSvg(backgroundColor) {
  const canvasSize = 2732;
  const badgeSize = 480;
  const scale = badgeSize / 64;
  const offset = (canvasSize - badgeSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" width="${canvasSize}" height="${canvasSize}">
  ${SEAL_GRADIENT_DEFS}
  <rect width="${canvasSize}" height="${canvasSize}" fill="${backgroundColor}" />
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <rect width="64" height="64" rx="15" fill="url(#sealGrad)" />
    <rect x="2.5" y="2.5" width="59" height="59" rx="12.5" fill="none" stroke="${COLORS.white}" stroke-opacity="0.25" stroke-width="1.5" />
    <path fill="${COLORS.white}" fill-rule="evenodd" d="${KANJI_NICHI_PATH}" />
  </g>
</svg>`;
}

async function loadSharp() {
  try {
    const mod = await import('sharp');
    return mod.default ?? mod;
  } catch {
    const require = createRequire(import.meta.url);
    for (const specifier of ['sharp', '@capacitor/assets/node_modules/sharp']) {
      try {
        return require(specifier);
      } catch {
        // Fallback to next candidate
      }
    }
    try {
      const assetsPkgPath = require.resolve('@capacitor/assets/package.json');
      return createRequire(assetsPkgPath)('sharp');
    } catch {
      throw new Error(
        'Modul "sharp" tidak ditemukan. Jalankan "npm install" terlebih dahulu sebelum membuat aset Android.'
      );
    }
  }
}

const ASSETS = [
  { name: 'icon-only.png', width: 1024, height: 1024, svg: createIconOnlySvg() },
  { name: 'icon-foreground.png', width: 1024, height: 1024, svg: createIconForegroundSvg() },
  { name: 'icon-background.png', width: 1024, height: 1024, svg: createIconBackgroundSvg() },
  { name: 'splash.png', width: 2732, height: 2732, svg: createSplashSvg(COLORS.washiPaper) },
  { name: 'splash-dark.png', width: 2732, height: 2732, svg: createSplashSvg(COLORS.sumiCanvas) },
];

async function main() {
  const sharp = await loadSharp();
  await mkdir(OUTPUT_DIR, { recursive: true });

  for (const asset of ASSETS) {
    const outPath = resolve(OUTPUT_DIR, asset.name);
    await sharp(Buffer.from(asset.svg))
      .resize(asset.width, asset.height)
      .png({ compressionLevel: 9 })
      .toFile(outPath);

    const [metadata, fileStat] = await Promise.all([sharp(outPath).metadata(), stat(outPath)]);
    const displayPath = relative(PROJECT_ROOT, outPath).replaceAll('\\', '/');
    console.log(
      `${displayPath} (${metadata.width}x${metadata.height}, ${fileStat.size.toLocaleString('en-US')} bytes)`
    );
  }
}

await main();
