// Generates public/images/og.png (1200x630) from an inline SVG using sharp,
// in the Surface Labs app palette (warm cream / tan / brown).
//
// Run from the repository root:
//   node scripts/generate-og.mjs
//
// The PNG is committed to the repo; re-run this only when the design changes.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="preview" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c09d6a"/>
      <stop offset="1" stop-color="#684720"/>
    </linearGradient>
    <pattern id="dots" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="#26241d"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="#191816"/>
  <rect width="1200" height="630" fill="url(#dots)"/>

  <!-- Brand mark + wordmark -->
  <g transform="translate(80,74)">
    <rect x="0" y="0" width="44" height="44" rx="10" fill="#242118" stroke="#4a4636"/>
    <path d="M13 13 C 24 13, 20 31, 31 31" fill="none" stroke="#c09d6a" stroke-width="3"/>
    <circle cx="13" cy="13" r="5" fill="#c09d6a"/>
    <circle cx="31" cy="31" r="5" fill="#eae5d3"/>
    <text x="60" y="30" fill="#eae5d3" font-family="Arial, sans-serif" font-size="26" font-weight="700">Surface Labs</text>
  </g>

  <!-- Headline -->
  <text x="80" y="290" fill="#eae5d3" font-family="Arial, sans-serif" font-size="66" font-weight="700">Node-based procedural</text>
  <text x="80" y="368" fill="#eae5d3" font-family="Arial, sans-serif" font-size="66" font-weight="700">PBR textures</text>
  <text x="80" y="436" fill="#cec8ae" font-family="Arial, sans-serif" font-size="29">Windows, macOS, Linux, Android and iPad. Any input.</text>

  <!-- Node graph motif -->
  <g transform="translate(820,150)" opacity="0.96">
    <g fill="none" stroke="#c09d6a" stroke-width="3">
      <path d="M120 70 C 165 70, 170 150, 215 150"/>
      <path d="M120 230 C 165 230, 170 150, 215 150"/>
    </g>
    <rect x="20" y="44" width="100" height="52" rx="10" fill="#242118" stroke="#4a4636"/>
    <circle cx="120" cy="70" r="6" fill="#c09d6a"/>
    <rect x="20" y="204" width="100" height="52" rx="10" fill="#242118" stroke="#4a4636"/>
    <circle cx="120" cy="230" r="6" fill="#c09d6a"/>
    <rect x="215" y="104" width="130" height="92" rx="10" fill="#242118" stroke="#4a4636"/>
    <rect x="235" y="124" width="90" height="52" rx="6" fill="url(#preview)"/>
  </g>
</svg>`;

const out = join(repoRoot, 'public', 'images', 'og.png');
await sharp(Buffer.from(svg)).png().toFile(out);
console.log('Wrote', out);
