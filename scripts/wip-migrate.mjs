// One-off bulk migration driver: fetch wip-podcast.com pages and write Astro
// content files using the deterministic parseMeta/parseBody/parseYoutube helpers.
// Safe to delete after the migration is complete.
//
// Usage: node scripts/wip-migrate.mjs blog
import fs from 'node:fs';
import path from 'node:path';
import { parseMeta, parseBody, parseYoutube } from './wip-extract.mjs';

const BASE = 'https://www.wip-podcast.com';
const ROOT = path.resolve(import.meta.dirname, '..');

// Light-touch de-brand: only the specific branded phrases. Leave a bare "[WIP]"
// alone (it is the podcast's actual name and is sometimes the subject).
const debrand = (s) =>
  (s ?? '')
    .replaceAll('[WIP] Podcast', 'the podcast')
    .replaceAll('the [WIP] show', 'the show')
    .replaceAll('[WIP] Blog', 'this blog');

const lower = (s) => (s ?? '').toLowerCase();
const yamlStr = (s) => JSON.stringify(debrand(s ?? ''));

async function getHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.text();
}

// ── Blog ───────────────────────────────────────────────────────────────────
const BLOG = [
  '00-learning-its-better-together', '01-failing-fast',
  '02-mongoose-subdocuments-and-discriminators', '03-clean-code-by-robert-c-martin',
  '04-how-to-start-working-with-ai', '05-fundamentals-of-backend-engineering-course-review',
  '06-peek-behind-the-bootcamp-curtain-', '07-experiences-with-a-local-gitlab-runner-part-1',
  '08-learning-typescript', '09-feeling-inadequate-is-okay', '10-the-power-of-career-change',
  '11-experiences-with-a-local-gitlab-runner-part2', '12-3-big-scary-software-engineering-words-explained',
  '13-exploring-typescript-ts-compiler', '14-exploring-typescript-runtime',
  '15-the-software-engineers-guidebook-by-gergely-orosz',
  '16-dependencies-or-dev-dependencies-that-is-the-question', '17-capturing-curiosity',
  '19-3-habits-that-helped-me-recover-from-burnout-and-stay-motivated',
  '20-jmeter-performance-testing-part-1', '21-opportunity-is-knocking',
  '22-jmeter-performance-testing-part-2', '23-the-hidden-currency-of-connection',
  '24-whats-the-difference', '25-the-importance-of-open-telemetry', '26-introducing-wip',
  '27-building-a-compass', '28-unlocking-your-browser', '29-your-new-best-friend-the-console',
  '30-whats-actually-happening', '31-level-up-sources-performance-and-your-playground',
];

async function migrateBlog() {
  const outDir = path.join(ROOT, 'src/content/blog');
  const results = [];
  for (const src of BLOG) {
    const slug = src.replace(/^\d+-/, '').replace(/-$/, '');
    try {
      const html = await getHtml(`${BASE}/${src}`);
      const meta = parseMeta(html);
      const body = debrand(parseBody(html));
      const fm = ['---'];
      fm.push(`title: ${yamlStr(lower(meta.title))}`);
      if (meta.description) fm.push(`description: ${yamlStr(meta.description)}`);
      if (meta.datePublished) fm.push(`pubDate: ${meta.datePublished}`);
      const tags = (meta.sections ?? []).map(lower);
      fm.push(`tags: ${JSON.stringify(tags)}`);
      if (meta.readingTimeMin) fm.push(`readingTime: ${meta.readingTimeMin}`);
      fm.push('---', '', body, '');
      fs.writeFileSync(path.join(outDir, `${slug}.md`), fm.join('\n'));
      results.push({ slug, ok: true, bytes: body.length, tags: tags.length, code: body.includes('```') });
    } catch (e) {
      results.push({ slug, ok: false, error: String(e.message) });
    }
  }
  return results;
}

// ── Podcast ──────────────────────────────────────────────────────────────────
// [sourceSlug]. Version/season parsed from the slug: v<major><minor><patch>.
const PODCAST = [
  'v000-the-first-commit', 'v001-david-weiss', 'v002-christin-martin',
  'v003-brendan-schirmer', 'v004-colin-j-lacy', 'v005-kim-maida', 'v006-nick-clark',
  'v007-keshia-coriolan', 'v008-mara-kaela', 'v009-grace-dees', 'v100-release-notes',
  'v102-erik-gross', 'v103-anna-miller',
];
const SOLO = new Set(['v000-the-first-commit', 'v100-release-notes']);

// Promote the inline "Your call to action? →" line into a styled heading + quote.
const promoteCta = (body) =>
  body.replace(/\*\*Your call to action\??\s*→?\s*\*\*\s*/i, '## your call to action\n\n> ');

async function migratePodcast() {
  const outDir = path.join(ROOT, 'src/content/podcast');
  const results = [];
  for (const src of PODCAST) {
    const m = src.match(/^v(\d)(\d)(\d+)-(.+)$/);
    const [, major, minor, patch, name] = m;
    const version = `v${major}.${minor}.${patch}`;
    const slug = `v${major}-${minor}-${patch}-${name}`;
    try {
      const html = await getHtml(`${BASE}/${src}`);
      const meta = parseMeta(html);
      const yt = parseYoutube(html);
      const titlePart = (meta.title ?? '').split(' - ').slice(1).join(' - ') || meta.title;
      const body = promoteCta(debrand(parseBody(html)));
      const fm = ['---'];
      fm.push(`title: ${yamlStr(lower(titlePart))}`);
      if (!SOLO.has(src)) fm.push(`guest: ${yamlStr(titlePart)}`);
      fm.push(`version: ${version}`);
      fm.push(`season: ${Number(major)}`);
      if (meta.datePublished) fm.push(`pubDate: ${meta.datePublished}`);
      if (yt) fm.push(`youtubeUrl: https://www.youtube.com/watch?v=${yt}`);
      fm.push('---', '', body, '');
      fs.writeFileSync(path.join(outDir, `${slug}.md`), fm.join('\n'));
      results.push({ slug, ok: true, bytes: body.length, yt: !!yt, chapters: /\*\*\d{1,2}:\d{2}/.test(body) });
    } catch (e) {
      results.push({ slug, ok: false, error: String(e.message) });
    }
  }
  return results;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const type = process.argv[2];
const runners = { blog: migrateBlog, podcast: migratePodcast };
if (!runners[type]) { console.error(`unknown type: ${type}`); process.exit(1); }
const results = await runners[type]();
for (const r of results) {
  console.log(r.ok ? `✓ ${r.slug}  (${r.bytes}b, ${r.tags} tags${r.code ? ', code' : ''})` : `✗ ${r.slug}  ${r.error}`);
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} migrated`);
