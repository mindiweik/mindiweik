# Social sharing cards (og:image) — design

_2026-07-03. Approved by Mindi via brainstorming session._

## Problem

Pages on mindiweik.com ship no `og:image` or `twitter:card` meta, so shared links (LinkedIn especially) render as bare text previews. Additionally, article pages emit the site tagline as `og:description` instead of the post's own description, because `ArticleLayout` never passes `description` down to `BaseHead`.

## Goals

1. Every page shares with a branded 1200×630 card.
2. Cards are zone-colored (blog blue, podcast pink, speaking green, projects amber) so the site's color-wayfinding extends to link previews.
3. A post can opt in to a custom card via one explicit frontmatter line. Nothing is ever derived automatically from post content (many post images are instructional screenshots).
4. Article pages emit their own description as `og:description`.
5. No changes to build or deploy pipelines. No runtime services.

## Non-goals (YAGNI)

- Per-post generated title cards (astro-og-canvas / satori at build time)
- Auto-deriving episode cards from YouTube thumbnails
- Any runtime image generation

All of these can be layered on later without undoing this work.

## Design

### Image resolution order

For any page, `og:image` resolves as:

1. Explicit `image` prop (from blog frontmatter `ogImage`, opt-in only)
2. Zone card: `/og/{zone}.png` for zone in blog | podcast | speaking | projects
3. Site default: `/og/default.png`

### Component changes

**`BaseHead.astro`** — `Props` gains `image?: string` and `zone?: string`. Emits:

- `og:image` as an absolute URL (`new URL(path, SITE.url)` — LinkedIn requires absolute)
- `og:image:width` 1200, `og:image:height` 630
- `twitter:card` = `summary_large_image`

**`BaseLayout.astro`** — passes `image` and `zone` through to `BaseHead` (same pattern as `description`).

**Layouts declare their zone** (one-line change each):

- `ArticleLayout` → `blog`; also gains `description?: string` and `image?: string` props and passes both through (this fixes the og:description bug)
- `EpisodeLayout` → `podcast`
- `SpeakingLayout` → `speaking`
- While in there: audit `EpisodeLayout`/`SpeakingLayout` for the same missing `description` passthrough as `ArticleLayout` and fix if present
- `ZoneIndexLayout` → its zone prop
- Project pages → `projects`
- Homepage/about/404 → no zone, get the default card

**Blog content schema** — optional `ogImage: z.string().optional()` with a comment noting images should be ~1200×630 (LinkedIn crops otherwise). `src/pages/blog/[...slug].astro` passes `post.data.description` and `post.data.ogImage` to `ArticleLayout`.

### Card generation (one-off script)

`scripts/generate-og-cards.mjs`, run manually, output committed. Uses `satori` + `@resvg/resvg-js` (devDependencies only).

- Renders five 1200×630 PNGs to `public/og/`: `default.png`, `blog.png`, `podcast.png`, `speaking.png`, `projects.png`
- Design: dark site background, thick zone-color edge stripe, zone name rendered as a chip (VersionChip-style), `mindiweik` wordmark in Space Grotesk (font file loaded from `@fontsource-variable/space-grotesk`)
- Default card uses the site tagline instead of a zone chip
- Zone colors duplicated from `global.css` tokens into the script with a comment pointing at the source of truth (satori can't read CSS vars)

Normal `npm run build` and the GitHub Actions deploy are untouched; the PNGs are static assets in `public/`.

### Verification

1. `npm run build`, then grep `dist/` for `og:image`, `og:description`, and `twitter:card` on one page per zone + homepage + a blog post
2. Confirm a blog post's `og:description` is the post description, not the site tagline
3. After deploy: run a post URL through LinkedIn Post Inspector to confirm the card renders (also busts LinkedIn's cache for previously shared links)

## Risks

- Wrongly-sized opt-in images crop unpredictably on LinkedIn (mitigated by schema comment; blast radius is one post)
- LinkedIn caches previews; card design changes after sharing require a Post Inspector re-scrape
