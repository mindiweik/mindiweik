// Build the wip-podcast.com landing page (Phase B).
//
// Generates wip-dist/index.html from the podcast content collection so the
// episode list never goes stale, and copies wip-landing/.htaccess (the 301
// map for every old wip-podcast.com URL). Deployed to the wip-podcast.com
// web root by the GitHub Action once the domain is on file hosting.
//
// Usage: node scripts/build-wip-landing.mjs

import { readFileSync, readdirSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src/content/podcast');
const outDir = join(root, 'wip-dist');

const fm = (src, key) => {
  const m = src.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?\\s*$`, 'm'));
  return m ? m[1].trim() : null;
};

const eps = readdirSync(contentDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const src = readFileSync(join(contentDir, f), 'utf8');
    return {
      slug: f.replace(/\.md$/, ''),
      title: fm(src, 'title'),
      version: fm(src, 'version'),
      season: Number(fm(src, 'season') ?? 0),
      pubDate: new Date(fm(src, 'pubDate')),
      duration: fm(src, 'duration'),
      draft: fm(src, 'draft') === 'true',
    };
  })
  .filter((e) => !e.draft && e.title && e.version)
  .sort((a, b) => b.pubDate - a.pubDate);

const seasons = [...new Set(eps.map((e) => e.season))].sort((a, b) => b - a);
const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

const row = (e, latestSeason) => {
  const chip = e.season < latestSeason
    ? `background:var(--surface);color:var(--accent);border:1px solid var(--accent)`
    : `background:var(--accent);color:var(--ink)`;
  return `      <a class="ep" href="https://mindiweik.com/podcast/${e.slug}">
        <span class="chip" style="${chip}">${e.version}</span>
        <span><span class="ep-title">${e.title}</span><span class="ep-meta">${fmtDate(e.pubDate)}${e.duration ? ' · ' + e.duration : ''}</span></span>
      </a>`;
};

const seasonBlock = (s) => `    <section>
      <div class="season"><span>season ${s} · v${s}.0.x</span><span class="rule"></span></div>
${eps.filter((e) => e.season === s).map((e) => row(e, seasons[0])).join('\n')}
    </section>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>[WIP] Podcast · human development in tech</title>
  <meta name="description" content="[WIP] Podcast: real talk. Life doesn't have release notes; we're figuring it out anyway, one version at a time." />
  <link rel="canonical" href="https://mindiweik.com/podcast" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    :root {
      --bg: #0B0E14; --surface: #11151F; --border: rgba(255,255,255,0.10);
      --text: #ECECF1; --text-muted: rgba(236,236,241,0.60); --ink: #0B0E14;
      --accent: #FF5C85;
      --font-display: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
      --font-body: "Inter", ui-sans-serif, system-ui, sans-serif;
      color-scheme: dark;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: var(--font-body); -webkit-font-smoothing: antialiased; }
    a { color: inherit; text-decoration: none; }
    main { max-width: 680px; margin: 0 auto; padding: 2.6rem 1.4rem 4rem; }
    .crumb { font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); }
    h1 { font-family: var(--font-display); font-weight: 700; font-size: 2rem; letter-spacing: -0.02em; line-height: 1.5; margin: 1rem 0 0; }
    h1 .hl { background: var(--accent); color: var(--ink); padding: 0.08em 0.34em; border-radius: 7px; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
    .sub { font-family: var(--font-body); font-size: 0.95rem; line-height: 1.65; color: var(--text); opacity: 0.9; margin-top: 1rem; }
    .btns { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1.4rem; }
    .btn { font-family: var(--font-mono); font-size: 0.7rem; padding: 0.4rem 0.65rem; border: 1px solid var(--border); border-radius: 6px; }
    .btn:hover, .ep:hover .ep-title { color: var(--accent); }
    .label { font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin: 2.4rem 0 0.2rem; }
    .season { display: flex; align-items: center; gap: 0.7rem; margin: 1.1rem 0 0.2rem; }
    .season span:first-child { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted); white-space: nowrap; }
    .rule { flex: 1; height: 1px; background: var(--border); }
    .ep { display: flex; gap: 0.75rem; align-items: flex-start; padding: 0.8rem 0; border-top: 1px solid var(--border); }
    .chip { font-family: var(--font-mono); font-size: 0.6rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; flex: none; }
    .ep-title { display: block; font-family: var(--font-display); font-weight: 500; font-size: 0.9rem; }
    .ep-meta { display: block; font-family: var(--font-mono); font-size: 0.6rem; color: var(--text-muted); margin-top: 0.3rem; }
    footer { border-top: 1px solid var(--border); margin-top: 3rem; }
    .foot { max-width: 680px; margin: 0 auto; padding: 1.4rem; font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted); display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .foot a { text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 2px; text-decoration-color: var(--accent); }
  </style>
</head>
<body>
  <main>
    <div class="crumb">~/wip-podcast</div>
    <h1><span class="hl">[WIP] Podcast: human development in tech</span></h1>
    <p class="sub">Real talk about the messy, honest, and ongoing process of growth. Life doesn't have release notes, so we write our own, one version at a time.</p>
    <div class="btns">
      <a class="btn" href="https://www.youtube.com/channel/UCMYEpKDKqHnAqcUG9N_qtKg" target="_blank" rel="noopener noreferrer">youtube &rarr;</a>
      <a class="btn" href="https://open.spotify.com/show/2Z6pfAQvwfxREv6uh8iPpb" target="_blank" rel="noopener noreferrer">spotify &rarr;</a>
      <a class="btn" href="https://podcasts.apple.com/us/podcast/wip-podcast/id1828753629" target="_blank" rel="noopener noreferrer">apple podcasts &rarr;</a>
      <a class="btn" href="https://ko-fi.com/wippodcast" target="_blank" rel="noopener noreferrer">support the show &rarr;</a>
    </div>
    <div class="label">// episodes · show notes on mindiweik.com</div>
${seasons.map(seasonBlock).join('\n')}
  </main>
  <footer>
    <div class="foot">
      <span>[WIP] Podcast is part of <a href="https://mindiweik.com">mindiweik.com</a></span>
      <span><a href="https://mindiweik.com/podcast">browse all episodes &rarr;</a></span>
    </div>
  </footer>
</body>
</html>
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), html);
copyFileSync(join(root, 'wip-landing/.htaccess'), join(outDir, '.htaccess'));
console.log(`wip-dist/index.html written (${eps.length} episodes, ${seasons.length} season(s)) + .htaccess copied`);
