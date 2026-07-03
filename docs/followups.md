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
- **Visual variety for long posts** — the longer, older blog posts read as walls of text; add visual variety (pull quotes, callouts, dividers, images?) at least for some. Deferred 2026-07-01.
- **Inline code styling** — make inline `code-word` spans more visually distinct (background/color/border) so they're easy to pick out in prose. `.prose code` in `src/styles/prose.css`. Deferred 2026-07-01.
- **Consistent title casing** — titles/headings are inconsistent (some lowercase site-voice, some title-case from source). Pick one convention and normalize across blog/podcast/speaking. Deferred 2026-07-01.
- **Internal cross-links point to old paths** — migrated content links to old wip-podcast paths like `/15-...` or `/vNNN-...` instead of `/blog/<slug>` or `/podcast/<slug>`. Sweep all content and rewrite internal links. Fixing case-by-case as flagged; needs a full pass. Deferred 2026-07-01.
- **Inline links duplicating link buttons** — some speaking/podcast bodies repeat a link inline that's already a frontmatter button (e.g. "Slide Deck"). Removing as flagged; could sweep. Deferred 2026-07-01.
- **Missing talk recordings** — ~~`the-software-engineers-guidebook-overview-talk`~~ ✅ Loom recording button added + embedded in the blog post (2026-07-02; Loom stays as host since it can't be downloaded for YT). Still to locate: `the-case-of-the-curious-engineer-talk`. Deferred 2026-07-01.

## Site features
- **Accessibility pass** — audit + fixes across the site: semantic landmarks/heading order,
  color contrast (accent-on-dark chips + muted text), focus states, alt text sweep (ties into
  the images pass), reduced-motion handling, keyboard nav on cards/nav. Run Lighthouse/axe as
  the baseline. Mindi requested 2026-07-02.
- **Comments** — comment capability on posts/episodes. Static-site-friendly options to evaluate:
  giscus (GitHub Discussions-backed, free, no ads, matches the dev audience), utterances
  (GitHub Issues), or a hosted service. Mindi requested 2026-07-02.
- **Smart 404** — instead of a plain 404, try to suggest a similar/related page (e.g. fuzzy-match
  the requested path against the collections' slugs client-side and offer "did you mean" links).
  Mindi requested 2026-07-02.
- **Email subscription** — newsletter signup so readers get new posts/episodes by email
  (replaces the old Substack subscribe). Options to evaluate: Buttondown (indie-friendly,
  RSS-to-email automation fits a static site), Kit/ConvertKit, or Mailerlite; site already
  has RSS+sitemap to feed it. Mindi requested 2026-07-02.

## Resolved
- ~~**Images for specific posts**~~ -> done 2026-07-02 (confirmed: zero `MIGRATION TODO`
  markers remain in `src/content/`; images live in `src/assets/blog`).
- ~~**Phase B: wip-podcast.com landing page + 301s**~~ -> LIVE 2026-07-02. Landing page +
  .htaccess redirect map deployed via deploy.yml; verified on apex and www (www needed a
  Hostinger CDN purge). Migration-era sitemap of old URLs live at wip-podcast.com/sitemap.xml.
- ~~**Related-content buttons**~~ -> shipped 2026-07-02. Tag-driven `RelatedPosts` (shared-tag
  scoring, recency tie-break, cap 4, recent-posts fallback) + `EpisodeNav` prev/next on podcast
  episodes. Open idea: gtag click event on related cards to see which links get used.
- ~~**Draft mode**~~ + ~~**Scheduled posts**~~ -> shipped 2026-07-02. `draft: true` frontmatter
  (blog/podcast/speaking) and future `pubDate`/`date` both render in dev (with a dashed
  draft/scheduled chip) and are excluded from prod builds via `src/lib/publish.ts` `isVisible`.
  Daily cron rebuild (13:00 UTC = 6am Denver in winter, 7am in summer) in deploy.yml releases
  scheduled posts; push or manual workflow run releases immediately. Since 2026-07-02, date-only
  pubDates release at the cron hour (not midnight UTC), so plain dates are safe long-term. Spec:
  `docs/superpowers/specs/2026-07-02-draft-mode-scheduled-posts-design.md`.
- ~~**Blog post chip label "essay"**~~ -> renamed to "blog" everywhere (chip, changelog type,
  About + blog index copy) per Mindi's pick (2026-07-02).
- ~~**Episode chapter timestamps** in accent-pink small text~~ -> converted to `--text-muted`
  for full accent-as-fill consistency (2026-06-30).
- ~~**Podcast archive copy** hardcoded "two seasons"~~ -> derived from `seasons.length`
  in `src/pages/podcast/index.astro` (2026-06-30).
