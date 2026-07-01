# Follow-ups (deferred from the scaffold task)

These are known, intentionally-deferred items from the initial scaffold. None block the
scaffold being "done." Most belong with the content-migration or light-mode (v1.1) work.

## Content / data
- **Projects revamp (post-migration)** — after the wip-podcast content migration, give each
  project its own detail page (longer description, links, images) instead of a bare index row.
  Fold these deferred bits into that work:
  - **Projects changelog date** is synthesized from `order` -> a Jan-2026 date in
    `src/lib/collections.ts`. Replace with real ship dates; add a test for the `order > 0` branch.
  - **Projects with no url** currently link to `#`. Real links come later (leave as-is for now).
- **About copy** is placeholder; real bio + the crew during content work.
- **Social links** — add Mindi's socials (LinkedIn, etc.) to the About page and/or the site footer (maybe both). Deferred 2026-07-01 during content migration.
- **Blog post chip label** — the blog article chip currently reads "essay" (VersionChip in `src/layouts/ArticleLayout.astro`). Mindi dislikes "essay"; pick a better word (post / writing / notes?). Deferred 2026-07-01.
- **Visual variety for long posts** — the longer, older blog posts read as walls of text; add visual variety (pull quotes, callouts, dividers, images?) at least for some. Deferred 2026-07-01.
- **Inline code styling** — make inline `code-word` spans more visually distinct (background/color/border) so they're easy to pick out in prose. `.prose code` in `src/styles/prose.css`. Deferred 2026-07-01.
- **Consistent title casing** — titles/headings are inconsistent (some lowercase site-voice, some title-case from source). Pick one convention and normalize across blog/podcast/speaking. Deferred 2026-07-01.
- **Images for specific posts** — migration was text-only. Some posts want images, e.g. `fundamentals-of-backend-engineering-course-review` (completion certificate). Source + add real images. Ties into the visual-variety followup. Deferred 2026-07-01.
- **Internal cross-links point to old paths** — migrated content links to old wip-podcast paths like `/15-...` or `/vNNN-...` instead of `/blog/<slug>` or `/podcast/<slug>`. Sweep all content and rewrite internal links. Fixing case-by-case as flagged; needs a full pass. Deferred 2026-07-01.
- **Inline links duplicating link buttons** — some speaking/podcast bodies repeat a link inline that's already a frontmatter button (e.g. "Slide Deck"). Removing as flagged; could sweep. Deferred 2026-07-01.

## Resolved
- ~~**Episode chapter timestamps** in accent-pink small text~~ -> converted to `--text-muted`
  for full accent-as-fill consistency (2026-06-30).
- ~~**Podcast archive copy** hardcoded "two seasons"~~ -> derived from `seasons.length`
  in `src/pages/podcast/index.astro` (2026-06-30).
