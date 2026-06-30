# wip-podcast.com → mindiweik.com migration — design

**Date:** 2026-06-30
**Status:** Approved (design), pending spec review
**Scope:** Migrate all 65 pages of content from the wip-podcast.com Website Builder site into mindiweik.com's Astro content collections, then 301-redirect every old URL and file a GSC Change of Address.

## Goal

Consolidate the full wip-podcast.com archive (podcast episodes, blog posts, talks, guest
appearances) onto mindiweik.com as owned, version-controlled content, and redirect the old
domain so existing links and the (modest) search presence survive the move.

## Why

wip-podcast.com is a Hostinger Website Builder (Zyro) site Mindi is retiring as the podcast
shifts to a solo format. The content is her body of work and should live on the site she
controls. Traffic is low (~12 clicks / 90 days, ~1,200 impressions), so the driver is
ownership and coherence, not SEO rescue. The one page with real visibility is
`/18-exploring-typescript-primitive-types` (361 impressions).

## Source facts (verified)

- Content is **server-rendered** in the HTML (≈17K visible chars on a sample post), so no
  headless-browser scraping is needed — `curl` + parse works.
- Each page carries clean **JSON-LD** metadata: `headline`/title, `description`,
  `datePublished`, `timeRequired` (reading time), `articleSection` (tags), `image`, `@type`.
- Canonical host is `www.wip-podcast.com`. Sitemap lists 65 URLs.
- wip-podcast.com is already a verified GSC property (`sc-domain:wip-podcast.com`).

## Decisions (locked in brainstorming)

| Decision | Choice |
|----------|--------|
| Content fidelity | **Light touch** — preserve substance, de-brand ("[WIP] Podcast"/"join us"/stray "we"→"I" where clearly Mindi). No rewriting. |
| Code blocks | **Preserved** as fenced markdown with language hints where detectable. |
| Hero images | **Dropped (text only)** for now. Old images are hard-branded to wip-podcast.com and would undercut the rebrand. Fresh covers are a possible later project. |
| Guest appearances | New **`guest`** value on the `speaking.type` enum; live on `/speaking` with a link to the original. |
| Episode slugs | `v101-jaidie-vargas` → `/podcast/v1-0-1-jaidie-vargas` (matches existing). Version `vABC` → `vA.B.C`; season = first digit. |
| Blog slugs | **Drop the leading number**: `18-exploring-typescript-primitive-types` → `/blog/exploring-typescript-primitive-types`. Old numbered URL 301s to it. |
| Rollout | **3 phases, strictly ordered**: A content → B redirects → C GSC. |

## Content-model change

Single schema edit in `src/content.config.ts`: extend `speaking.type`:

```ts
type: z.enum(['talk', 'workshop', 'panel', 'guest']).optional(),
```

The `/speaking` page/layout must render `guest` entries (label them as appearances and surface
the outbound `links[0]` to the original). No other schema changes. No hero-image field.

## URL inventory + mapping (65 URLs)

**Podcast episodes (16) → `/podcast/<vA-B-C-name>`** (version `vA.B.C`, season = first digit):
`v000-the-first-commit`, `v001-david-weiss`, `v002-christin-martin`, `v003-brendan-schirmer`,
`v004-colin-j-lacy`, `v005-kim-maida`, `v006-nick-clark`, `v007-keshia-coriolan`,
`v008-mara-kaela`, `v009-grace-dees`, `v0010-joram-mutenge`, `v100-release-notes`,
`v101-jaidie-vargas`, `v102-erik-gross`, `v103-anna-miller`, `v104-anemari-fiser`.
(`v101`/`v104` already exist on the new site — overwrite/reconcile, do not duplicate.)

**Numbered posts (32) → `/blog/<slug-without-number>`:**
`00-learning-its-better-together` … `31-level-up-sources-performance-and-your-playground`
(full set 00–31 from the sitemap). New slug = old slug with the leading `NN-` stripped.

**Your talks (5) → `/speaking` (type `talk`):**
`building-a-brand-with-linkedin-talk`, `capturing-curiosity-talk`,
`the-case-of-the-curious-engineer-talk`, `the-software-engineers-guidebook-overview-talk`,
`how-to-see-the-invisible-intro-to-opentelemetry`.

**Guest appearances (5) → `/speaking` (type `guest`):**
`episode-233-how-mindi-navigated-adhd-bootcamp-burnout-and-landed-a-dev-role`,
`growing-in-tech-insights-from-career-and-real-world-projects-with-mindi-weik`,
`linkedin-live-career-conversations-personal-branding-with-mindi-weik`,
`linkedin-live-thriving-in-tech-with-adhd`,
`software-engineering-tales-career-switch-to-software-engineering-with-mindi-weik`.

**Pages (7) → redirect only, no new standalone pages** (reviewed individually; none have
content worth rebuilding as their own page):
| Old | New |
|-----|-----|
| `/` | `/` (home) |
| `/about` | `/about` |
| `/mindi` | `/about` |
| `/speak` | `/speaking` |
| `/personal-development-blog` | `/blog` |
| `/show-notes-tech-podcast` | `/podcast` |
| `/subscribe-email-newsletter` | `/` (no newsletter on the new site) |

**Harvest from `/mindi` into the existing About page** (Phase A, small edit, Mindi approves):
the old `/mindi` bio names things the current About omits and worth pulling in:
- the advocacy/mission line: amplifying underrepresented groups in tech, **particularly women
  and neurodivergent folks**.
- (optional) pronouns and the explicit "speaker / writer" framing.
- Skip the résumé-style "wrangled integrations / RESTful APIs" lines — too formal for the
  About voice.
- **Correct a factual discrepancy:** the current About says "five-plus years"; the right figure
  is **"10+ years"** (Mindi confirmed). Update the About bio accordingly. Domain stays "real
  estate and marketing" unless Mindi says otherwise.

Total: 16 + 32 + 5 + 5 + 7 = 65. ✓

## Extraction approach

Per URL: `curl -sL` the `www` page → parse the JSON-LD block for frontmatter fields → extract
the article body container → convert to markdown (headings, lists, links, **fenced code blocks
with language hints**) → apply light-touch de-brand → write the content file with frontmatter.
Each page is independent, so extraction is parallelizable (candidate for a multi-agent run at
execution time). 58 content files are produced (16 episodes + 32 posts + 5 talks + 5 guest;
the 7 pages-bucket URLs are redirect-only, not extracted). Of the 16 episodes, 2 already exist
(`v1-0-1`, `v1-0-4`) and are reconciled rather than duplicated. Frontmatter mapping:

- blog: `title`, `description`, `pubDate`(datePublished), `readingTime`(timeRequired, minutes),
  `tags`(articleSection).
- podcast: `title`, `guest`, `version`, `season`, `pubDate`, `duration` (parse from body/JSON-LD
  where present); `chapters`/`links`/`audioUrl`/`youtubeUrl` populated when discoverable, else
  omitted.
- speaking: `title`, `event`, `date`, `type` (`talk`|`guest`), `description`, `links` (original).

## Redirect infrastructure (Phase B)

1. Move wip-podcast.com off Website Builder → file hosting on the existing Hostinger plan,
   producing `domains/wip-podcast.com/public_html` (mirrors the mindiweik.com setup).
2. Add `.htaccess` in that web root with one `301` per old path → absolute new mindiweik.com
   URL, covering both `www.` and bare host. Final catch-all: unmapped → `https://mindiweik.com/`.
   Example rules:
   ```apache
   RewriteEngine On
   Redirect 301 /18-exploring-typescript-primitive-types https://mindiweik.com/blog/exploring-typescript-primitive-types
   Redirect 301 /v101-jaidie-vargas https://mindiweik.com/podcast/v1-0-1-jaidie-vargas
   # ... one per mapped URL ...
   RedirectMatch 301 ^/(.*)$ https://mindiweik.com/
   ```
3. Verify with `curl -sI` on each old URL: expect `301` and the correct `Location`.

## GSC Change of Address (Phase C)

After redirects are live AND mindiweik.com is a verified GSC property (the domain-property TXT
retry is queued for 2026-07-01), use GSC's Change of Address tool on
`sc-domain:wip-podcast.com` → mindiweik.com. Keep the old property verified to monitor the
handoff. **Phase C is blocked until mindiweik.com verifies in GSC.**

## Rollout phases (strictly ordered)

- **Phase A — Content:** extract + rebuild all 58 content files, deploy to mindiweik.com,
  Mindi verifies. The old site is untouched; nothing redirects yet. This is a complete,
  shippable milestone on its own.
- **Phase B — Redirects:** hosting move + `.htaccess`, verify every old URL 301s correctly.
- **Phase C — GSC:** Change of Address (waits on mindiweik.com GSC verification).

A 301 to a missing page is worse than no redirect, so content must be live and verified before
Phase B.

## Testing

- `npm run build` clean (now ~70 pages) and `npm test` green at each commit.
- Every new page renders; code blocks display via `.prose pre`/`code`; reading time + tags present.
- Episode pages reconcile with the 2 pre-existing ones (no dupes, version/season correct).
- `/speaking` renders `guest` entries with outbound links.
- Phase B: `curl -sI` each of the 65 old URLs → `301` + correct `Location`; catch-all works.

## Out of scope (YAGNI)

- Hero/cover images (dropped now; possible later mindiweik-branded redesign).
- Newsletter/subscribe functionality (old `/subscribe` → home).
- Comments, audio hosting, or any new podcast infrastructure.
- Backfilling `chapters`/`audioUrl` where the old pages don't expose them.

## Open dependencies

- Phase C waits on mindiweik.com GSC domain-property verification (Motion task due 2026-07-01).
- Phase B requires moving wip-podcast.com off Website Builder (Mindi action in hPanel, same
  steps as the mindiweik.com migration).
