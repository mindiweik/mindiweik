# Projects revamp: detail pages, real dates, lineup refresh

**Date:** 2026-07-03
**Status:** Approved (brainstorm with Mindi, MARVIN session)
**Branch:** `feat/projects-revamp` (worktree, isolated from other session work)

## Goal

Replace the bare projects index rows with real detail pages, kill the synthesized
changelog dates, fix the `#` link fallback, and refresh which projects are listed.
Closes the "Projects revamp" item in `docs/followups.md`.

## Decisions (from brainstorm)

- **Lineup (5):** Audition Cat, Drip Dash, mindiweik.com (this site), catz4life,
  prettykitties. Page identity stays "things I build" (software only).
- **Cards navigate internally** to detail pages; external links (live site, repo)
  become buttons on the detail page. The `?? '#'` fallback dies.
- **Dates are hybrid:** a required `since` year in frontmatter + an automatic
  "last active" from the GitHub API at build time (fresh daily via the existing
  13:23 UTC cron rebuild).
- **Changelog keeps projects**, dated by latest activity, labeled `update`
  (was `ship`). Date fallback chain: manual `lastUpdated` frontmatter →
  GitHub `pushedAt` → Jan 1 of `since`.
- **Audition Cat is the flagship and is treated differently:** repo is GitLab +
  private, so no auto-fetch. Meta reads "since 2023 · ongoing · alpha", no commit
  date. Changelog position is bumped manually via `lastUpdated` at milestones.
  GitLab API integration (needs PAT) is a deferred follow-up, if ever.
- **Screenshots come from Mindi**; pages render cleanly without them, images slot
  in as they arrive.

## Architecture (Approach A: mirror the blog pattern)

### Schema (`src/content.config.ts`)

```ts
// projects gains:
since: z.number(),                 // year, required
lastUpdated: z.coerce.date().optional(), // manual changelog bump (Audition Cat)
image: image().optional(),         // screenshot
imageAlt: z.string().optional(),   // refined: required when image is set
```

`blurb` stays as the card meta line. The markdown **body** (currently empty in all
files) becomes the long description. `repoUrl` doubles as the GitHub fetch key.
`order` keeps driving index sort only — it no longer synthesizes dates.

### Content (`src/content/projects/`)

- Existing `audition-cat.md`, `drip-dash.md` get bodies + `since`.
- New: `mindiweik-site.md`, `catz4life.md`, `prettykitties.md`.
- Long descriptions drafted in Mindi's voice (lowercase headings, conversational,
  no emdashes), reviewed by Mindi before merge.

### GitHub activity (`src/lib/github.ts`)

- `fetchRepoActivity(repoUrl)` → parses `owner/name` from github.com URLs,
  GETs `api.github.com/repos/{owner}/{name}`, returns `{ pushedAt: Date } | null`.
- Non-github.com URLs (e.g. GitLab) → `null` immediately, no fetch.
- Auth: `GITHUB_TOKEN` env when present (free in Actions), anonymous otherwise.
- Any error/timeout → warn + `null`. A badge must never fail a deploy.
- Called at build time only; no client-side JS.

### Pages

- **New `src/pages/projects/[...slug].astro`** — `getStaticPaths` over the
  collection (same shape as blog's), rendering through a new
  **`src/layouts/ProjectLayout.astro`**: name, status chip, stack chips, meta line
  ("since 2023 · last commit june 2026" — or "since 2023 · ongoing · alpha" when
  there's no fetchable repo), optional screenshot, prose body, then link buttons
  (live site / github) in the existing button style.
- **`src/pages/projects/index.astro`** — cards `href={/projects/${p.id}}`;
  meta line unchanged; featured ★ unchanged.

### Changelog (`src/lib/collections.ts`)

Project entries become
`{ type: 'update', date: lastUpdated ?? pushedAt ?? Jan1(since), url: /projects/{id} }`.
Note the date is a moving target for active repos (bumps on every push +
daily rebuild) — accepted by design ("show based on latest update").

### Deploy (`.github/workflows/deploy.yml`)

Pass `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` (or `github.token`) to the build
step so the API calls are authenticated. Applies to both prod and dev preview
builds.

## Error handling

- GH fetch fails → no "last active" line on the detail page; changelog falls back
  per the chain; build succeeds with a warning.
- Missing screenshot → image section not rendered at all.
- `since` is schema-required, so a new project can't silently regress the
  changelog to epoch-0 like the old `order` hack could.

## Testing (vitest, alongside existing suites)

- `github.test.ts`: repo-URL parsing (github.com https/ssh-ish variants, GitLab →
  null, garbage → null); fetch is mocked — no live API in tests.
- `collections.test.ts` additions: changelog date fallback chain
  (lastUpdated > pushedAt > since), `update` type label, detail-page URLs.
- Index sort by `order` unchanged (existing coverage).
- No live network calls anywhere in the test suite.

## Out of scope / deferred

- GitLab API for Audition Cat activity (needs PAT; likely never worth it).
- Screenshot capture itself (Mindi provides; wiring is in scope).
- gtag click events on project cards (open idea, tracked with the related-cards
  one in followups.md).

## Follow-up bookkeeping (at merge time)

- `docs/followups.md`: mark "Projects revamp" resolved (including the changelog
  date + `#` link sub-items).
