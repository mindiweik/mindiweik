// Renders the five social share cards to public/og/.
// Rerun manually (npm run og:cards) only when the card design changes;
// the PNGs are committed and normal builds never touch this.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;
// Rasterize at 2x (2400x1260) so previews stay crisp on retina displays;
// the layout is still designed at 1200x630 logical pixels.
const SCALE = 2;

// Duplicated from src/styles/global.css :root tokens (satori can't read CSS vars).
// If the site palette changes, update here and rerun.
const BG = '#0B0E14';
const TEXT = '#ECECF1';
const MUTED = 'rgba(236,236,241,0.60)';
const INK = '#0B0E14';
const ACCENTS = {
  blog: '#6E7BFF',
  podcast: '#FF5C85',
  speaking: '#34D399',
  projects: '#FF9F45',
};
const TAGLINE = 'software engineer, writer, builder. figuring it out in public, one version at a time.';

const grotesk = readFileSync('node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff');
const mono = readFileSync('node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff');

const el = (type, style, children) => ({ type, props: { style, children } });

function card({ zone, accent }) {
  return el('div', {
    width: '100%', height: '100%', display: 'flex', position: 'relative',
    flexDirection: 'column', justifyContent: 'center',
    backgroundColor: BG, paddingLeft: 96, paddingRight: 96,
  }, [
    // zone-color stripe down the left edge
    el('div', { position: 'absolute', left: 0, top: 0, width: 28, height: H, backgroundColor: accent }),
    // chip (zone cards) or muted prompt (default card), VersionChip-style
    zone
      ? el('div', { display: 'flex', alignSelf: 'flex-start', backgroundColor: accent, color: INK, borderRadius: 12, padding: '10px 24px', fontFamily: 'JetBrains Mono', fontSize: 32, fontWeight: 700, marginBottom: 30 }, zone)
      : el('div', { display: 'flex', color: MUTED, fontFamily: 'JetBrains Mono', fontSize: 32, marginBottom: 30 }, '~/'),
    el('div', { display: 'flex', color: TEXT, fontFamily: 'Space Grotesk', fontSize: 112, fontWeight: 700, letterSpacing: '-0.02em' }, 'mindiweik'),
    el('div', { display: 'flex', color: MUTED, fontFamily: 'JetBrains Mono', fontSize: 28, marginTop: 32, lineHeight: 1.5 },
      zone ? `mindiweik.com/${zone}` : TAGLINE),
  ]);
}

mkdirSync('public/og', { recursive: true });
const fonts = [
  { name: 'Space Grotesk', data: grotesk, weight: 700, style: 'normal' },
  { name: 'JetBrains Mono', data: mono, weight: 700, style: 'normal' },
];
const targets = [
  { file: 'default.png', zone: null, accent: ACCENTS.blog },
  ...Object.entries(ACCENTS).map(([zone, accent]) => ({ file: `${zone}.png`, zone, accent })),
];
for (const t of targets) {
  const svg = await satori(card(t), { width: W, height: H, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W * SCALE } }).render().asPng();
  writeFileSync(`public/og/${t.file}`, png);
  console.log(`wrote public/og/${t.file}`);
}
