# Phase 2 technical on-page SEO implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add canonical URLs, JSON-LD structured data, missing OG/twitter/author meta tags, dev-preview noindex, and sitemap lastmod to mindiweik.com.

**Architecture:** Pure schema/URL builders live in `src/lib/` (unit-testable with vitest), a tiny `JsonLd.astro` component serializes them into pages, and `BaseHead.astro` grows canonical/meta support via props threaded through `BaseLayout`. Sitemap lastmod is a frontmatter scan wired into the sitemap integration's `serialize` hook in `astro.config.mjs`.

**Tech Stack:** Astro 7 (static output), TypeScript, vitest, @astrojs/sitemap, zod content collections.

**Spec:** `docs/superpowers/specs/2026-07-06-seo-aeo-design.md` (phase 2)

## Global constraints

- Work happens in the worktree at `~/dev/mindiweik-worktrees/seo-onpage` on branch `feat/seo-onpage`. Never commit to `main`.
- Commit messages: conventional prefix (`feat:`, `test:`, `chore:`). NEVER add a Co-Authored-By trailer or any Claude attribution.
- No emdashes in any copy or comments. Sentence casing for headings except H1.
- The site is `https://mindiweik.com` in production; `DEPLOY_SITE` env overrides it for the dev.mindiweik.com preview build. Canonicals must respect `Astro.site` so the preview keeps pointing at itself, and non-production hosts must emit `noindex`.
- Run `npm test` (vitest) after each task; baseline is 98 tests passing in 11 files.
- Lint/format run via husky on commit; if a commit fails on lint, run `npm run lint:fix` and `npm run format`.

---

### Task 1: schema and URL builders (`src/lib/schema.ts`, `src/lib/urls.ts`)

**Files:**
- Create: `src/lib/urls.ts`
- Create: `src/lib/urls.test.ts`
- Create: `src/lib/schema.ts`
- Create: `src/lib/schema.test.ts`

**Interfaces:**
- Consumes: `SITE` from `src/config/site.ts` (has `name`, `url`, `author`, `description`, `socials: {label, url, accent}[]`).
- Produces (used by tasks 2-4):
  - `canonicalUrl(pathname: string, site: URL | string): string` - absolute URL, trailing slash normalized on
  - `serializeJsonLd(schema: object): string`
  - `personSchema(): object`
  - `websiteSchema(): object`
  - `blogPostingSchema(input: { title: string; description?: string; url: string; datePublished: Date; dateModified?: Date; image: string; tags?: string[] }): object`
  - `podcastSeriesSchema(): object`
  - `podcastEpisodeSchema(input: { title: string; url: string; datePublished: Date; description?: string; seasonNumber: number; episodeNumber?: number }): object`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/urls.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { canonicalUrl } from './urls';

describe('canonicalUrl', () => {
  it('builds an absolute URL with a trailing slash', () => {
    expect(canonicalUrl('/blog/my-post', 'https://mindiweik.com')).toBe(
      'https://mindiweik.com/blog/my-post/',
    );
  });

  it('keeps an existing trailing slash', () => {
    expect(canonicalUrl('/blog/my-post/', 'https://mindiweik.com')).toBe(
      'https://mindiweik.com/blog/my-post/',
    );
  });

  it('handles the root path', () => {
    expect(canonicalUrl('/', 'https://mindiweik.com')).toBe('https://mindiweik.com/');
  });

  it('leaves file-like paths alone', () => {
    expect(canonicalUrl('/rss.xml', 'https://mindiweik.com')).toBe('https://mindiweik.com/rss.xml');
  });

  it('respects an alternate site origin (dev preview)', () => {
    expect(canonicalUrl('/about', new URL('https://dev.mindiweik.com'))).toBe(
      'https://dev.mindiweik.com/about/',
    );
  });
});
```

Create `src/lib/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  serializeJsonLd,
  personSchema,
  websiteSchema,
  blogPostingSchema,
  podcastSeriesSchema,
  podcastEpisodeSchema,
} from './schema';

describe('serializeJsonLd', () => {
  it('escapes < so content cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><b>' })).not.toContain('</script>');
    expect(serializeJsonLd({ name: '</script>' })).toContain('\\u003c');
  });
});

describe('personSchema', () => {
  it('identifies Mindi with sameAs profile links', () => {
    const p = personSchema() as Record<string, unknown>;
    expect(p['@type']).toBe('Person');
    expect(p.name).toBe('Mindi Weik');
    expect(p.url).toBe('https://mindiweik.com');
    expect(p.sameAs).toContain('https://www.linkedin.com/in/mindiweik/');
    expect(p.sameAs).toContain('https://github.com/mindiweik');
  });
});

describe('websiteSchema', () => {
  it('describes the site with its author', () => {
    const w = websiteSchema() as Record<string, any>;
    expect(w['@type']).toBe('WebSite');
    expect(w.url).toBe('https://mindiweik.com');
    expect(w.author.name).toBe('Mindi Weik');
  });
});

describe('blogPostingSchema', () => {
  const base = {
    title: 'my post',
    url: 'https://mindiweik.com/blog/my-post/',
    datePublished: new Date('2026-07-01T00:00:00Z'),
    image: 'https://mindiweik.com/og/blog.png',
  };

  it('emits headline, ISO dates, and author', () => {
    const b = blogPostingSchema({
      ...base,
      description: 'desc',
      dateModified: new Date('2026-07-03T00:00:00Z'),
      tags: ['ai', 'debugging'],
    }) as Record<string, any>;
    expect(b['@type']).toBe('BlogPosting');
    expect(b.headline).toBe('my post');
    expect(b.datePublished).toBe('2026-07-01T00:00:00.000Z');
    expect(b.dateModified).toBe('2026-07-03T00:00:00.000Z');
    expect(b.keywords).toBe('ai, debugging');
    expect(b.author.name).toBe('Mindi Weik');
    expect(b.mainEntityOfPage).toBe(base.url);
  });

  it('omits optional fields when absent', () => {
    const b = blogPostingSchema(base) as Record<string, unknown>;
    expect(b).not.toHaveProperty('dateModified');
    expect(b).not.toHaveProperty('keywords');
    expect(b).not.toHaveProperty('description');
  });
});

describe('podcast schemas', () => {
  it('series names [WIP] Podcast at /podcast', () => {
    const s = podcastSeriesSchema() as Record<string, any>;
    expect(s['@type']).toBe('PodcastSeries');
    expect(s.name).toBe('[WIP] Podcast');
    expect(s.url).toBe('https://mindiweik.com/podcast');
  });

  it('episode links back to the series with season info', () => {
    const e = podcastEpisodeSchema({
      title: 'v1.0.1 - Jaidie Vargas',
      url: 'https://mindiweik.com/podcast/v1-0-1-jaidie-vargas/',
      datePublished: new Date('2026-01-15T00:00:00Z'),
      seasonNumber: 1,
      episodeNumber: 1,
    }) as Record<string, any>;
    expect(e['@type']).toBe('PodcastEpisode');
    expect(e.partOfSeries.name).toBe('[WIP] Podcast');
    expect(e.partOfSeason.seasonNumber).toBe(1);
    expect(e.episodeNumber).toBe(1);
  });

  it('omits episodeNumber and description when absent', () => {
    const e = podcastEpisodeSchema({
      title: 't',
      url: 'u',
      datePublished: new Date('2026-01-15T00:00:00Z'),
      seasonNumber: 2,
    }) as Record<string, unknown>;
    expect(e).not.toHaveProperty('episodeNumber');
    expect(e).not.toHaveProperty('description');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ~/dev/mindiweik-worktrees/seo-onpage && npx vitest run src/lib/urls.test.ts src/lib/schema.test.ts`
Expected: FAIL - cannot resolve `./urls` and `./schema`.

- [ ] **Step 3: Write the implementations**

Create `src/lib/urls.ts`:

```ts
// Canonical URL policy: directory-style URLs always end with a trailing
// slash (matches Hostinger's static serving); file-like paths (dots) do not.
export function canonicalUrl(pathname: string, site: URL | string): string {
  const lastSegment = pathname.split('/').pop() ?? '';
  const isFile = lastSegment.includes('.');
  const normalized = isFile || pathname.endsWith('/') ? pathname : `${pathname}/`;
  return new URL(normalized, site).href;
}
```

Create `src/lib/schema.ts`:

```ts
import { SITE } from '../config/site.ts';

// JSON-LD builders for search engines and AI answer engines. Pure functions
// so they stay unit-testable; pages render them through JsonLd.astro.

const CONTEXT = 'https://schema.org';
const SERIES_NAME = '[WIP] Podcast';

const author = () => ({ '@type': 'Person', name: SITE.author, url: SITE.url });

// Escape < so a value like "</script>" cannot close the inline script tag.
export function serializeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

export function personSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    name: SITE.author,
    url: SITE.url,
    jobTitle: 'Software Engineer',
    sameAs: SITE.socials.map((s) => s.url),
  };
}

export function websiteSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    author: author(),
  };
}

export function blogPostingSchema(input: {
  title: string;
  description?: string;
  url: string;
  datePublished: Date;
  dateModified?: Date;
  image: string;
  tags?: string[];
}) {
  return {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    mainEntityOfPage: input.url,
    datePublished: input.datePublished.toISOString(),
    ...(input.dateModified ? { dateModified: input.dateModified.toISOString() } : {}),
    image: input.image,
    ...(input.tags && input.tags.length > 0 ? { keywords: input.tags.join(', ') } : {}),
    author: author(),
  };
}

export function podcastSeriesSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'PodcastSeries',
    name: SERIES_NAME,
    url: `${SITE.url}/podcast`,
    author: author(),
  };
}

export function podcastEpisodeSchema(input: {
  title: string;
  url: string;
  datePublished: Date;
  description?: string;
  seasonNumber: number;
  episodeNumber?: number;
}) {
  return {
    '@context': CONTEXT,
    '@type': 'PodcastEpisode',
    name: input.title,
    url: input.url,
    datePublished: input.datePublished.toISOString(),
    ...(input.description ? { description: input.description } : {}),
    partOfSeason: { '@type': 'PodcastSeason', seasonNumber: input.seasonNumber },
    ...(input.episodeNumber != null ? { episodeNumber: input.episodeNumber } : {}),
    partOfSeries: { '@type': 'PodcastSeries', name: SERIES_NAME, url: `${SITE.url}/podcast` },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/urls.test.ts src/lib/schema.test.ts`
Expected: PASS (all new tests). Then run the full suite: `npm test` - expected 98 + new tests, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add src/lib/urls.ts src/lib/urls.test.ts src/lib/schema.ts src/lib/schema.test.ts
git commit -m "feat: JSON-LD schema and canonical URL builders"
```

---

### Task 2: JsonLd component, Person and WebSite on homepage and about

**Files:**
- Create: `src/components/layout/JsonLd.astro`
- Modify: `src/pages/index.astro` (frontmatter imports + first children of `<BaseLayout>`)
- Modify: `src/pages/about.astro` (same pattern)

**Interfaces:**
- Consumes: `serializeJsonLd`, `personSchema`, `websiteSchema` from `src/lib/schema.ts` (Task 1).
- Produces: `JsonLd.astro` with `Props { schema: object }` - used again in Task 4.

Note: JSON-LD is valid anywhere in the document (Google reads it from the body), so the component renders inline where each page composes it. No head-slot plumbing needed.

- [ ] **Step 1: Create the component**

Create `src/components/layout/JsonLd.astro`:

```astro
---
import { serializeJsonLd } from '../../lib/schema.ts';
interface Props {
  schema: object;
}
const { schema } = Astro.props;
---

<script type="application/ld+json" is:inline set:html={serializeJsonLd(schema)} />
```

- [ ] **Step 2: Wire into the homepage**

In `src/pages/index.astro`, add to the frontmatter imports:

```ts
import JsonLd from '../components/layout/JsonLd.astro';
import { personSchema, websiteSchema } from '../lib/schema.ts';
```

Then make these the first children of `<BaseLayout title={SITE.name}>`:

```astro
<BaseLayout title={SITE.name}>
  <JsonLd schema={personSchema()} />
  <JsonLd schema={websiteSchema()} />
  <Hero />
```

- [ ] **Step 3: Wire into the about page**

In `src/pages/about.astro`, add to the frontmatter imports:

```ts
import JsonLd from '../components/layout/JsonLd.astro';
import { personSchema } from '../lib/schema.ts';
```

Then add as the first child of `<BaseLayout title="about" active="/about">`:

```astro
<BaseLayout title="about" active="/about">
  <JsonLd schema={personSchema()} />
```

- [ ] **Step 4: Verify via build**

```bash
npm run build
grep -c 'application/ld+json' dist/index.html        # expected: 2
grep -o '"@type":"Person"' dist/index.html            # expected: match
grep -o '"@type":"WebSite"' dist/index.html           # expected: match
grep -c 'application/ld+json' dist/about/index.html   # expected: 1
```

Also run `npm run check` - expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/JsonLd.astro src/pages/index.astro src/pages/about.astro
git commit -m "feat: Person and WebSite JSON-LD on homepage and about"
```

---

### Task 3: canonical, og:url, article type, twitter/author meta, preview noindex

**Files:**
- Modify: `src/components/layout/BaseHead.astro`
- Modify: `src/layouts/BaseLayout.astro` (Props + BaseHead call)
- Modify: `src/layouts/ArticleLayout.astro` (BaseLayout call only)

**Interfaces:**
- Consumes: `canonicalUrl` from `src/lib/urls.ts` (Task 1).
- Produces: `BaseHead`/`BaseLayout` accept optional `type?: 'website' | 'article'` and `pubDate?: Date` props (Task 4's ArticleLayout changes rely on these already being threaded).

- [ ] **Step 1: Extend BaseHead**

In `src/components/layout/BaseHead.astro`, replace the frontmatter Props block with:

```ts
import { SITE } from '../../config/site.ts';
import { canonicalUrl } from '../../lib/urls.ts';
interface Props {
  title: string;
  description?: string;
  image?: string;
  zone?: string;
  type?: 'website' | 'article';
  pubDate?: Date;
}
const { title, description = SITE.description, image, zone, type = 'website', pubDate } = Astro.props;
const fullTitle = title === SITE.name ? title : `${title} · ${SITE.name}`;
// Astro.site follows DEPLOY_SITE, so the dev preview canonicalizes to itself
// (and gets noindexed) while production canonicalizes to mindiweik.com.
const site = Astro.site ?? new URL(SITE.url);
const canonical = canonicalUrl(Astro.url.pathname, site);
const isProdHost = site.hostname === 'mindiweik.com';
```

(Keep the existing OG_CARD_VERSION / ogImage lines unchanged.)

In the template, replace `<meta property="og:type" content="website" />` with the block below, and add the new tags after `<meta name="description" ...>`:

```astro
<link rel="canonical" href={canonical} />
{!isProdHost && <meta name="robots" content="noindex" />}
<meta name="author" content={SITE.author} />
<meta property="og:url" content={canonical} />
<meta property="og:type" content={type} />
{
  type === 'article' && pubDate && (
    <meta property="article:published_time" content={pubDate.toISOString()} />
  )
}
{type === 'article' && <meta property="article:author" content={SITE.author} />}
<meta name="twitter:title" content={fullTitle} />
<meta name="twitter:description" content={description} />
```

(og:title/og:description/og:image and the twitter card/image tags stay as they are.)

- [ ] **Step 2: Thread props through BaseLayout**

In `src/layouts/BaseLayout.astro`, extend Props and the BaseHead call:

```ts
interface Props {
  title: string;
  description?: string;
  image?: string;
  zone?: string;
  active?: string;
  type?: 'website' | 'article';
  pubDate?: Date;
}
const { title, description, image, zone, active, type, pubDate } = Astro.props;
```

```astro
<BaseHead
  title={title}
  description={description}
  image={image}
  zone={zone}
  type={type}
  pubDate={pubDate}
/>
```

- [ ] **Step 3: Mark blog posts as articles**

In `src/layouts/ArticleLayout.astro`, extend the BaseLayout call:

```astro
<BaseLayout
  title={title}
  description={description}
  image={image}
  zone="blog"
  active="/blog"
  type="article"
  pubDate={date}
>
```

- [ ] **Step 4: Verify via build (production and preview)**

```bash
npm run build
POST=$(ls dist/blog | head -2 | tail -1)
grep -o '<link rel="canonical" href="https://mindiweik.com/blog/'"$POST"'/"' "dist/blog/$POST/index.html"
grep -o 'og:type" content="article"' "dist/blog/$POST/index.html"      # article on posts
grep -o 'article:published_time' "dist/blog/$POST/index.html"          # present
grep -o 'og:type" content="website"' dist/index.html                    # homepage stays website
grep -c 'name="robots" content="noindex"' dist/index.html               # expected: 0 (grep exits 1)

DEPLOY_SITE=https://dev.mindiweik.com npm run build
grep -o 'name="robots" content="noindex"' dist/index.html               # expected: match
grep -o 'canonical" href="https://dev.mindiweik.com/"' dist/index.html  # preview self-canonical

npm run build   # rebuild clean production dist before moving on
```

Run `npm test` and `npm run check` - expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/BaseHead.astro src/layouts/BaseLayout.astro src/layouts/ArticleLayout.astro
git commit -m "feat: canonical URLs, article OG type, twitter/author meta, preview noindex"
```

---

### Task 4: BlogPosting, PodcastEpisode, and PodcastSeries JSON-LD

**Files:**
- Modify: `src/layouts/ArticleLayout.astro` (Props + JsonLd render)
- Modify: `src/pages/blog/[...slug].astro` (pass `updatedDate`)
- Modify: `src/layouts/EpisodeLayout.astro` (Props + JsonLd render)
- Modify: `src/pages/podcast/[...slug].astro` (pass `episodeNumber`)
- Modify: `src/pages/podcast/index.astro` (series JsonLd)

**Interfaces:**
- Consumes: `JsonLd.astro` (Task 2); `blogPostingSchema`, `podcastEpisodeSchema`, `podcastSeriesSchema` from `src/lib/schema.ts`; `canonicalUrl` from `src/lib/urls.ts` (Task 1).
- Produces: nothing consumed later; final schema wiring.

- [ ] **Step 1: BlogPosting in ArticleLayout**

In `src/layouts/ArticleLayout.astro` frontmatter, add imports and page URL:

```ts
import JsonLd from '../components/layout/JsonLd.astro';
import { blogPostingSchema } from '../lib/schema.ts';
import { canonicalUrl } from '../lib/urls.ts';
import { SITE } from '../config/site.ts';
```

Add `updatedDate?: Date;` to the Props interface and `updatedDate` to the destructuring. Then below the existing consts:

```ts
const pageUrl = canonicalUrl(Astro.url.pathname, Astro.site ?? new URL(SITE.url));
const schemaImage = new URL(image ?? '/og/blog.png', SITE.url).href;
```

Render as the first child inside `<BaseLayout ...>`:

```astro
<JsonLd
  schema={blogPostingSchema({
    title,
    description,
    url: pageUrl,
    datePublished: date,
    dateModified: updatedDate,
    image: schemaImage,
    tags,
  })}
/>
```

In `src/pages/blog/[...slug].astro`, add to the ArticleLayout call:

```astro
  updatedDate={post.data.updatedDate}
```

- [ ] **Step 2: PodcastEpisode in EpisodeLayout**

In `src/layouts/EpisodeLayout.astro` frontmatter, add imports:

```ts
import JsonLd from '../components/layout/JsonLd.astro';
import { podcastEpisodeSchema } from '../lib/schema.ts';
import { canonicalUrl } from '../lib/urls.ts';
import { SITE } from '../config/site.ts';
```

Add `episodeNumber?: number;` to Props and the destructuring, then:

```ts
const pageUrl = canonicalUrl(Astro.url.pathname, Astro.site ?? new URL(SITE.url));
```

Render as the first child inside its `<BaseLayout ...>`:

```astro
<JsonLd
  schema={podcastEpisodeSchema({
    title,
    url: pageUrl,
    datePublished: pubDate,
    description: descriptor,
    seasonNumber: season,
    episodeNumber,
  })}
/>
```

In `src/pages/podcast/[...slug].astro`, add to the EpisodeLayout call:

```astro
  episodeNumber={d.episodeNumber}
```

- [ ] **Step 3: PodcastSeries on the podcast index**

In `src/pages/podcast/index.astro`, add imports:

```ts
import JsonLd from '../../components/layout/JsonLd.astro';
import { podcastSeriesSchema } from '../../lib/schema.ts';
```

Render as the first child inside its `<ZoneIndexLayout ...>` (JSON-LD in body is fine):

```astro
<JsonLd schema={podcastSeriesSchema()} />
```

- [ ] **Step 4: Verify via build**

```bash
npm run build
POST=$(ls dist/blog | head -2 | tail -1)
grep -o '"@type":"BlogPosting"' "dist/blog/$POST/index.html"
EP=$(ls dist/podcast | head -2 | tail -1)
grep -o '"@type":"PodcastEpisode"' "dist/podcast/$EP/index.html"
grep -o '"@type":"PodcastSeries"' dist/podcast/index.html
```

All expected to match. Run `npm test` and `npm run check` - green.

- [ ] **Step 5: Commit**

```bash
git add src/layouts/ArticleLayout.astro src/layouts/EpisodeLayout.astro 'src/pages/blog/[...slug].astro' 'src/pages/podcast/[...slug].astro' src/pages/podcast/index.astro
git commit -m "feat: BlogPosting, PodcastEpisode, and PodcastSeries JSON-LD"
```

---

### Task 5: sitemap lastmod

**Files:**
- Create: `src/lib/sitemap-lastmod.mjs` (plain JS so `astro.config.mjs` can import it before the TS pipeline exists)
- Create: `src/lib/sitemap-lastmod.test.mjs` (plain JS test, matching the existing `scripts/*.test.mjs` convention, so the `.mjs` module needs no TS shims)
- Modify: `astro.config.mjs`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `extractLastmod(source: string): string | null` and `buildLastmodMap(contentBase?: string): Map<string, string>` where keys are pathnames without trailing slash (`/blog/my-post`) and values are `YYYY-MM-DD`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/sitemap-lastmod.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractLastmod, buildLastmodMap } from './sitemap-lastmod.mjs';

describe('extractLastmod', () => {
  it('prefers updatedDate over pubDate', () => {
    const src = `---\ntitle: 't'\npubDate: 2026-01-01\nupdatedDate: 2026-02-02\n---\nbody`;
    expect(extractLastmod(src)).toBe('2026-02-02');
  });

  it('falls back to pubDate, tolerating quotes', () => {
    expect(extractLastmod(`---\npubDate: '2026-03-04'\n---`)).toBe('2026-03-04');
  });

  it('falls back to date (speaking collection)', () => {
    expect(extractLastmod(`---\ndate: 2026-05-06\n---`)).toBe('2026-05-06');
  });

  it('returns null when no date field exists', () => {
    expect(extractLastmod(`---\ntitle: 'x'\n---`)).toBeNull();
  });

  it('ignores dates in the body', () => {
    expect(extractLastmod(`---\ntitle: 'x'\n---\npubDate: 2026-01-01`)).toBeNull();
  });
});

describe('buildLastmodMap', () => {
  it('maps collection routes to dates from fixture files', () => {
    const base = mkdtempSync(join(tmpdir(), 'lastmod-'));
    mkdirSync(join(base, 'blog'));
    mkdirSync(join(base, 'podcast'));
    writeFileSync(join(base, 'blog', 'my-post.md'), `---\npubDate: 2026-01-01\n---\n`);
    writeFileSync(join(base, 'podcast', 'ep-1.mdx'), `---\npubDate: 2026-02-02\n---\n`);
    writeFileSync(join(base, 'blog', 'notes.txt'), 'not content');
    const map = buildLastmodMap(base);
    expect(map.get('/blog/my-post')).toBe('2026-01-01');
    expect(map.get('/podcast/ep-1')).toBe('2026-02-02');
    expect(map.size).toBe(2);
  });

  it('skips collections whose directory is missing', () => {
    const base = mkdtempSync(join(tmpdir(), 'lastmod-'));
    expect(buildLastmodMap(base).size).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/sitemap-lastmod.test.mjs`
Expected: FAIL - cannot resolve `./sitemap-lastmod.mjs`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/sitemap-lastmod.mjs`:

```js
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Frontmatter-only date scan. A YAML parser would be overkill: collection
// schemas already enforce these fields, we just need the YYYY-MM-DD prefix.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;
const dateRe = (field) => new RegExp(`^${field}:\\s*['"]?(\\d{4}-\\d{2}-\\d{2})`, 'm');

export function extractLastmod(source) {
  const frontmatter = source.match(FRONTMATTER_RE)?.[1];
  if (!frontmatter) return null;
  for (const field of ['updatedDate', 'pubDate', 'date']) {
    const m = frontmatter.match(dateRe(field));
    if (m) return m[1];
  }
  return null;
}

// Maps URL pathnames (no trailing slash) to lastmod dates for the sitemap.
export function buildLastmodMap(contentBase = './src/content') {
  const map = new Map();
  for (const dir of ['blog', 'podcast', 'speaking']) {
    let files;
    try {
      files = readdirSync(join(contentBase, dir));
    } catch {
      continue;
    }
    for (const file of files) {
      if (!/\.(md|mdx)$/.test(file)) continue;
      const date = extractLastmod(readFileSync(join(contentBase, dir, file), 'utf8'));
      if (date) map.set(`/${dir}/${file.replace(/\.(md|mdx)$/, '')}`, date);
    }
  }
  return map;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/sitemap-lastmod.test.mjs`
Expected: PASS.

- [ ] **Step 5: Wire into astro.config.mjs**

In `astro.config.mjs`, add the import and build the map once at config time:

```js
import { buildLastmodMap } from './src/lib/sitemap-lastmod.mjs';

const lastmodMap = buildLastmodMap();
```

Replace `sitemap()` in `integrations` with:

```js
sitemap({
  serialize(item) {
    const pathname = new URL(item.url).pathname.replace(/\/+$/, '') || '/';
    const lastmod = lastmodMap.get(pathname);
    return lastmod ? { ...item, lastmod } : item;
  },
}),
```

- [ ] **Step 6: Verify via build**

```bash
npm run build
grep -c '<lastmod>' dist/sitemap-0.xml     # expected: > 0 (roughly one per post/episode/talk)
grep -o '<lastmod>2026-[0-9-]*</lastmod>' dist/sitemap-0.xml | head -3
```

Run `npm test` - full suite green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/sitemap-lastmod.mjs src/lib/sitemap-lastmod.test.mjs astro.config.mjs
git commit -m "feat: sitemap lastmod from content frontmatter dates"
```

---

### Task 6: full verification pass

**Files:** none created; verification only.

- [ ] **Step 1: Full local gate**

```bash
npm test && npm run check && npm run lint && npm run build
```

Expected: all green, build completes.

- [ ] **Step 2: Structured data spot-check**

Extract one JSON-LD payload per type and validate the JSON parses:

```bash
node -e '
const { readFileSync, readdirSync } = require("fs");
const files = ["dist/index.html", "dist/about/index.html", "dist/podcast/index.html"];
const post = readdirSync("dist/blog").find((f) => !f.includes("."));
const ep = readdirSync("dist/podcast").find((f) => !f.includes("."));
files.push(`dist/blog/${post}/index.html`, `dist/podcast/${ep}/index.html`);
for (const f of files) {
  const html = readFileSync(f, "utf8");
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
  for (const b of blocks) JSON.parse(b[1]);
  console.log(f, "->", blocks.map((b) => JSON.parse(b[1])["@type"]).join(", ") || "NONE");
}'
```

Expected output: Person, WebSite on index; Person on about; PodcastSeries on podcast index; BlogPosting on the post; PodcastEpisode on the episode. NONE anywhere is a failure.

- [ ] **Step 3: Meta tag spot-check**

```bash
grep -c 'rel="canonical"' dist/index.html                       # 1
grep -c 'property="og:url"' dist/index.html                     # 1
grep -c 'name="twitter:title"' dist/index.html                  # 1
grep -c 'name="author"' dist/index.html                         # 1
grep -rL 'rel="canonical"' dist --include=index.html | head     # expected: empty (every page has one)
```

- [ ] **Step 4: Post-merge follow-ups (manual, note for Mindi)**

After deploy: run the Google rich results test on the homepage, one post, and one episode; re-request indexing in GSC for the homepage and top posts so Google picks up the new markup.
