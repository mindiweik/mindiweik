# Social Share Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every page on mindiweik.com ships a zone-colored 1200×630 `og:image` (with explicit per-post opt-in override), and article pages emit their real description instead of the site tagline.

**Architecture:** Five static PNGs in `public/og/` rendered once by a checked-in script (satori + resvg) from the site's design tokens. `BaseHead.astro` resolves `og:image` via: explicit image prop → `/og/{zone}.png` → `/og/default.png`. Layouts declare their zone; the blog schema gains an opt-in `ogImage` field. No build/deploy pipeline changes.

**Tech Stack:** Astro 7 static site, satori + @resvg/resvg-js (devDependencies), vitest (existing), Space Grotesk / JetBrains Mono via static @fontsource packages.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-03-social-share-cards-design.md`
- Cards are exactly 1200×630
- `og:image` URLs must be absolute (`new URL(path, SITE.url)`) — LinkedIn rejects relative
- Nothing is ever auto-derived from post content; custom cards are explicit frontmatter opt-in only
- Colors come from `src/styles/global.css` dark tokens: bg `#0B0E14`, text `#ECECF1`, muted `rgba(236,236,241,0.60)`, ink `#0B0E14`; accents blog `#6E7BFF`, podcast `#FF5C85`, speaking `#34D399`, projects `#FF9F45`
- All card copy is lowercase (site style); no emdashes anywhere
- Commit after each task but do NOT push until Mindi has approved the card PNGs (Task 1 checkpoint) and all tasks pass
- New packages are devDependencies only — the shipped site gains no runtime deps

---

### Task 1: Card generator script + the five PNGs

**Files:**
- Create: `scripts/generate-og-cards.mjs`
- Create: `scripts/generate-og-cards.test.mjs`
- Create (generated): `public/og/{default,blog,podcast,speaking,projects}.png`
- Modify: `package.json` (devDeps + `og:cards` script)

**Interfaces:**
- Produces: `public/og/default.png`, `public/og/blog.png`, `public/og/podcast.png`, `public/og/speaking.png`, `public/og/projects.png` — the exact paths Task 2's `BaseHead` resolution logic assumes exist.

- [ ] **Step 1: Install devDependencies**

```bash
cd ~/Desktop/mindiweik
npm install -D satori @resvg/resvg-js @fontsource/space-grotesk @fontsource/jetbrains-mono
```

(The existing `@fontsource-variable/*` packages ship variable fonts, which satori does not support — hence the static packages, dev-only.)

- [ ] **Step 2: Write the failing test**

Create `scripts/generate-og-cards.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// PNG IHDR: width at byte offset 16, height at 20 (big-endian u32)
const CARDS = ['default', 'blog', 'podcast', 'speaking', 'projects'];

describe('og cards', () => {
  it.each(CARDS)('public/og/%s.png exists and is 1200x630', (name) => {
    const buf = readFileSync(new URL(`../public/og/${name}.png`, import.meta.url));
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run scripts/generate-og-cards.test.mjs`
Expected: 5 FAIL with `ENOENT ... public/og/default.png` etc.

- [ ] **Step 4: Write the generator**

Create `scripts/generate-og-cards.mjs`:

```js
// Renders the five social share cards to public/og/.
// Rerun manually (npm run og:cards) only when the card design changes;
// the PNGs are committed and normal builds never touch this.
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const W = 1200;
const H = 630;

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
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: W } }).render().asPng();
  writeFileSync(`public/og/${t.file}`, png);
  console.log(`wrote public/og/${t.file}`);
}
```

Add to `package.json` scripts: `"og:cards": "node scripts/generate-og-cards.mjs"`.

- [ ] **Step 5: Generate and verify**

Run: `npm run og:cards` then `npx vitest run scripts/generate-og-cards.test.mjs`
Expected: 5 files written, 5 tests PASS.

- [ ] **Step 6: CHECKPOINT — show Mindi the PNGs**

Open/display all five `public/og/*.png` for Mindi's review. **Do not proceed to commit or later tasks until she approves the design.** Iterate on `card()` styling per her feedback and rerun `npm run og:cards`.

- [ ] **Step 7: Commit (after approval)**

```bash
git add scripts/generate-og-cards.mjs scripts/generate-og-cards.test.mjs public/og/ package.json package-lock.json
git commit -m "feat: og card generator + five zone share cards"
```

---

### Task 2: BaseHead emits og:image / twitter:card; BaseLayout passthrough

**Files:**
- Modify: `src/components/layout/BaseHead.astro`
- Modify: `src/layouts/BaseLayout.astro:6-12`

**Interfaces:**
- Consumes: `public/og/{zone}.png` paths from Task 1; `SITE.url` from `src/config/site.ts`
- Produces: `BaseHead` Props `{ title: string; description?: string; image?: string; zone?: string }`; `BaseLayout` Props `{ title: string; description?: string; image?: string; zone?: string; active?: string }`. Task 3 layouts pass `zone`/`description`/`image` through `BaseLayout`.

- [ ] **Step 1: Update BaseHead.astro**

Frontmatter becomes:

```astro
---
import { SITE } from '../../config/site.ts';
interface Props { title: string; description?: string; image?: string; zone?: string; }
const { title, description = SITE.description, image, zone } = Astro.props;
const fullTitle = title === SITE.name ? title : `${title} · ${SITE.name}`;
// og:image resolution: explicit page image -> zone card -> site default.
// Absolute URL required (LinkedIn ignores relative paths).
const ogImage = new URL(image ?? (zone ? `/og/${zone}.png` : '/og/default.png'), SITE.url).href;
---
```

After the existing `<meta property="og:type" content="website" />` line add:

```astro
<meta property="og:image" content={ogImage} />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content={ogImage} />
```

- [ ] **Step 2: Update BaseLayout.astro**

```astro
interface Props { title: string; description?: string; image?: string; zone?: string; active?: string; }
const { title, description, image, zone, active } = Astro.props;
```

and

```astro
<BaseHead title={title} description={description} image={image} zone={zone} />
```

- [ ] **Step 3: Build and verify default card on homepage**

Run: `npm run build && grep -o '<meta[^>]*og:image[^>]*>' dist/index.html && grep -o '<meta[^>]*twitter:card[^>]*>' dist/index.html`
Expected: `og:image` = `https://mindiweik.com/og/default.png`, width/height metas, `twitter:card` = `summary_large_image`.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/BaseHead.astro src/layouts/BaseLayout.astro
git commit -m "feat: og:image + twitter:card meta with zone-card fallback"
```

---

### Task 3: Layouts declare zones + description fixes

**Files:**
- Modify: `src/layouts/ArticleLayout.astro:10-15` (Props + BaseLayout call)
- Modify: `src/layouts/EpisodeLayout.astro` (BaseLayout call)
- Modify: `src/layouts/SpeakingLayout.astro` (Props + BaseLayout call)
- Modify: `src/layouts/ZoneIndexLayout.astro` (BaseLayout call)
- Modify: the speaking detail page that renders `SpeakingLayout` (find via `grep -rn "SpeakingLayout" src/pages/`)

**Interfaces:**
- Consumes: `BaseLayout` Props from Task 2
- Produces: `ArticleLayout` Props gain `description?: string; image?: string` (Task 4's blog page passes both)

- [ ] **Step 1: ArticleLayout — zone, description, image**

Props line becomes:

```astro
interface Props { title: string; slug: string; date: Date; tags: string[]; readingMins: number; youtubeUrl?: string; state?: PublishState; description?: string; image?: string; }
const { title, slug, date, tags, readingMins, youtubeUrl, state, description, image } = Astro.props;
```

BaseLayout call becomes:

```astro
<BaseLayout title={title} description={description} image={image} zone="blog" active="/blog">
```

- [ ] **Step 2: EpisodeLayout — zone + descriptor as description**

The layout already receives `descriptor` from its page; no page change needed. BaseLayout call becomes:

```astro
<BaseLayout title={title} description={descriptor} zone="podcast" active="/podcast">
```

- [ ] **Step 3: SpeakingLayout — zone + description prop**

Add `description?: string;` to Props and destructure it. BaseLayout call becomes:

```astro
<BaseLayout title={title} description={description} zone="speaking" active="/speaking">
```

Then find the page rendering it: `grep -rn "SpeakingLayout" src/pages/` and add `description={<entry>.data.description}` to the `<SpeakingLayout ...>` call, using whatever variable that page names its collection entry (speaking schema already has optional `description`).

- [ ] **Step 4: ZoneIndexLayout — zone + sub as description**

BaseLayout call becomes:

```astro
<BaseLayout title={z.label} description={sub} zone={zone} active={z.route}>
```

- [ ] **Step 5: Cover any zone index NOT using ZoneIndexLayout**

Run: `grep -rLn "ZoneIndexLayout" src/pages/projects/index.astro src/pages/blog/index.astro src/pages/podcast/index.astro src/pages/speaking/index.astro`
For any listed file that calls `<BaseLayout ...>` directly, add the matching `zone="projects"` (etc.) prop to that call.

- [ ] **Step 6: Build and verify one page per zone**

Run: `npm run build`, then for each of `dist/blog/why-i-rebuilt-my-site/index.html`, one file under `dist/podcast/`, one under `dist/speaking/`, `dist/projects/index.html`:
`grep -o '<meta[^>]*og:image"[^>]*>' <file>` and `grep -o '<meta[^>]*og:description[^>]*>' <file>`
Expected: og:image ends in the matching zone PNG; the rebuilt-site post's og:description is "Tearing down the old site, keeping the version numbers." (not the site tagline).

- [ ] **Step 7: Commit**

```bash
git add src/layouts/ src/pages/
git commit -m "feat: layouts declare og zones; fix article/episode/speaking og:description"
```

---

### Task 4: Opt-in ogImage frontmatter field

**Files:**
- Modify: `src/content.config.ts` (blog schema)
- Modify: `src/pages/blog/[...slug].astro:15`

**Interfaces:**
- Consumes: `ArticleLayout` `description`/`image` props from Task 3
- Produces: blog frontmatter field `ogImage?: string`

- [ ] **Step 1: Add schema field**

In the `blog` collection schema, after `youtubeUrl`:

```ts
    // Social share override, explicit opt-in only (never auto-derived).
    // Use ~1200x630 images or LinkedIn crops unpredictably.
    ogImage: z.string().optional(),
```

- [ ] **Step 2: Pass description + ogImage from the blog page**

The `<ArticleLayout ...>` call in `src/pages/blog/[...slug].astro` gains two props:

```astro
<ArticleLayout title={post.data.title} description={post.data.description} image={post.data.ogImage} slug={post.id} date={post.data.pubDate} tags={post.data.tags} readingMins={mins} youtubeUrl={post.data.youtubeUrl} state={publishState(post.data, new Date())}>
```

- [ ] **Step 3: Build and verify**

Run: `npm run build && grep -o 'content="[^"]*og/blog.png"' dist/blog/why-i-rebuilt-my-site/index.html`
Expected: match (post has no ogImage set, falls back to the blog zone card). Also run `npx vitest run` — full suite PASS.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts "src/pages/blog/[...slug].astro"
git commit -m "feat: opt-in ogImage frontmatter override for blog posts"
```

---

### Task 5: Ship + post-deploy verification

**Files:** none (push + external checks)

- [ ] **Step 1: Confirm Mindi approved the card PNGs in Task 1's checkpoint** (hard gate — do not push otherwise)

- [ ] **Step 2: Push**

```bash
git push origin main
```

Expected: "Deploy to Hostinger" workflow runs; check with `gh run watch`.

- [ ] **Step 3: Post-deploy checks**

- `curl -s https://mindiweik.com/blog/why-i-rebuilt-my-site/ | grep -o '<meta[^>]*og:image[^>]*>'` → blog.png absolute URL
- `curl -sI https://mindiweik.com/og/blog.png` → 200, image/png
- Ask Mindi to run https://www.linkedin.com/post-inspector/ on the rebuilt-site post URL — confirms the card renders AND busts LinkedIn's cached bare preview from today's share.
