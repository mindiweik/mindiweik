# Draft mode + scheduled posts

Date: 2026-07-02 · Status: approved

## Goal

Let in-progress content live on `main` and render in local dev, while production
builds exclude it. Two gates, one mechanism:

- **Draft:** `draft: true` frontmatter hides an entry from prod.
- **Scheduled:** a future `pubDate` (blog/podcast) or `date` (speaking) hides an
  entry from prod until a rebuild after that time. A daily cron rebuild releases it.

## Design

### Publish gate: `src/lib/publish.ts`

Pure, testable core plus a thin env wrapper (mirrors the `collections.ts` pattern):

- `publishState(data, now)` → `'draft' | 'scheduled' | 'published'`
  - `data.draft === true` → `'draft'` (wins over scheduling)
  - `data.pubDate ?? data.date` in the future of `now` → `'scheduled'`
  - otherwise → `'published'`
- `isVisible(entry)` → `true` when `import.meta.env.DEV`, else
  `publishState(entry.data, new Date()) === 'published'`. Prod evaluates "now" at
  build time, which is deploy time — that's what makes cron rebuilds release posts.

### Schema

Add `draft: z.boolean().default(false)` to the **speaking** collection
(blog and podcast already have it). Projects are unchanged (no dates, no drafts).

### Call sites

Replace every inline `(e) => !e.data.draft` filter with `isVisible`, and add it
where filtering is missing today:

- `src/lib/collections.ts` (`getChangelog`: blog, podcast, **+ speaking**)
- `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`
- `src/pages/podcast/index.astro`, `src/pages/podcast/[...slug].astro`
- `src/pages/tags/index.astro`, `src/pages/tags/[tag].astro`
- `src/pages/speaking/index.astro`, `src/pages/speaking/[...slug].astro` (**new**)
- `src/pages/rss.xml.js`

Net effect: dev renders everything, prod renders only published entries
(pages, indexes, tags, changelog, RSS, and therefore the sitemap).

### Dev-only badge: `src/components/content/PublishStateChip.astro`

Small mono chip showing `draft` or `scheduled`, rendered only when
`import.meta.env.DEV` and the state isn't `published`. Placed on:

- `EntryCard` (new optional `state` prop, chip next to the title)
- `ArticleLayout` / `EpisodeLayout` headers

Prod builds never emit it.

### Scheduling mechanics: `.github/workflows/deploy.yml`

Add a `schedule:` trigger: `cron: '0 13 * * *'` — 6am Denver in winter (MST),
7am in summer (MDT). Day-granularity by design. "Release now" = push anything or
run the workflow manually (`workflow_dispatch` already exists).

Timezone note: a date-only `pubDate: 2026-07-10` parses as midnight UTC (6pm
July 9 Denver). Fine for day-granularity; for a specific moment use a full
timestamp with offset (`2026-07-10T09:00:00-06:00`).

## Testing

Vitest unit tests for `publishState`: draft true, future date, past date,
draft + future date, speaking `date` field, missing date. `isVisible`'s env
branch is exercised implicitly (dev server vs prod build spot check).

## First test content

`content/blog-ai-rubber-duck-draft.md` from the MARVIN workspace migrates to
`src/content/blog/` with `draft: true` as the first live draft.
