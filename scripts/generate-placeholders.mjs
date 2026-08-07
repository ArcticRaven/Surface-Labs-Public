// Generates labeled placeholder screenshots for the homepage gallery, in the
// Surface Labs app palette (warm cream / tan / brown).
//
// Run from the repository root:
//   node scripts/generate-placeholders.mjs
//
// These are temporary stand-ins for screenshots not yet supplied. Replace each
// file in src/assets/screenshots/ with a real screenshot using the SAME
// filename to keep gallery order and captions.
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'src',
	'assets',
	'screenshots'
);

const W = 1600;
const H = 1000;

// Only the shots we don't yet have real captures for.
const shots = [
	{ file: '01-graph-editor.png', title: 'Graph editor', note: 'Compose shader nodes on an infinite canvas' },
	{ file: '02-hub-library.png', title: 'Project hub & library', note: 'Organize projects and materials on custom shelves' },
	{ file: '04-custom-shader.png', title: 'Custom shader nodes', note: 'Write node logic in the built-in shading language' },
];

function esc(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function svgFor({ title, note }) {
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="34" height="34" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="2" fill="#26241d"/>
    </pattern>
    <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c09d6a"/>
      <stop offset="1" stop-color="#684720"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#191816"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>

  <!-- Window chrome -->
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="18" fill="#1d1b16" stroke="#3a3730"/>
  <rect x="40" y="40" width="${W - 80}" height="56" rx="18" fill="#2f2b20"/>
  <rect x="40" y="78" width="${W - 80}" height="18" fill="#2f2b20"/>
  <circle cx="76" cy="68" r="7" fill="#4a4636"/>
  <circle cx="100" cy="68" r="7" fill="#4a4636"/>
  <circle cx="124" cy="68" r="7" fill="#4a4636"/>
  <rect x="160" y="58" width="220" height="20" rx="10" fill="#242118"/>

  <!-- Accent node motif -->
  <g transform="translate(120,300)" opacity="0.9">
    <g fill="none" stroke="#c09d6a" stroke-width="4">
      <path d="M150 60 C 210 60, 220 150, 280 150"/>
      <path d="M150 240 C 210 240, 220 150, 280 150"/>
    </g>
    <rect x="40" y="30" width="110" height="60" rx="12" fill="#242118" stroke="#4a4636"/>
    <circle cx="150" cy="60" r="7" fill="#c09d6a"/>
    <rect x="40" y="210" width="110" height="60" rx="12" fill="#242118" stroke="#4a4636"/>
    <circle cx="150" cy="240" r="7" fill="#c09d6a"/>
    <rect x="280" y="110" width="150" height="80" rx="12" fill="#242118" stroke="#4a4636"/>
    <rect x="470" y="120" width="120" height="120" rx="14" fill="url(#chip)"/>
  </g>

  <text x="120" y="700" fill="#eae5d3" font-family="Arial, sans-serif" font-size="58" font-weight="700">${esc(title)}</text>
  <text x="120" y="752" fill="#cec8ae" font-family="Arial, sans-serif" font-size="30">${esc(note)}</text>
  <text x="120" y="828" fill="#8a8272" font-family="Arial, sans-serif" font-size="22" letter-spacing="1">PLACEHOLDER: REPLACE WITH A REAL SCREENSHOT</text>
</svg>`;
}

for (const shot of shots) {
	const buf = Buffer.from(svgFor(shot));
	await sharp(buf).png().toFile(join(outDir, shot.file));
	console.log('Wrote', shot.file);
}
