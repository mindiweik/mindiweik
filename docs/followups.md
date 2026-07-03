# Follow-ups (deferred from the scaffold task)

These are known, intentionally-deferred items from the initial scaffold. None block the
scaffold being "done." Most belong with the content-migration or light-mode (v1.1) work.

## Content / data

- **Visual variety for long posts** — the longer, older blog posts read as walls of text; add visual variety (pull quotes, callouts, dividers, images?) at least for some. Deferred 2026-07-01.
- **Missing talk recordings** — ~~`the-software-engineers-guidebook-overview-talk`~~ ✅ Loom recording button added + embedded in the blog post (2026-07-02; Loom stays as host since it can't be downloaded for YT). Still to locate: `the-case-of-the-curious-engineer-talk`. Deferred 2026-07-01.

## Site features

- **PR build gate + branch protection** — run `astro build` + `astro check` on every PR and
  block merge to main on failure. Since main auto-deploys to prod, this is the seatbelt against
  a bad merge going live. Mindi requested 2026-07-03.
  - **Partial (7/3):** `.github/workflows/lint.yml` now runs ESLint + Prettier check + tests on
    every push/PR (see resolved "Linting + formatting"). Still to add here: `astro build` +
    `astro check` steps, and the branch-protection rule to actually block merge on red.
- **Prose lint in CI** — enforce the documented writing conventions automatically: fail on
  emdashes in `src/content/` (extend to sentence-casing / lowercase-hashtag checks later).
  Freezes the manual style review into a check that runs every push. Mindi requested 2026-07-03.
- **Link checker in CI** — automate the dead-link pass (lychee or similar) so internal/external
  links stay clean as content grows, instead of relying on periodic manual sweeps.
  Mindi requested 2026-07-03.
- **Structured data (JSON-LD)** — add schema.org markup: `Article` for blog posts,
  `PodcastEpisode` for episodes. Improves search appearance (ties into the GSC work).
  Mindi requested 2026-07-03.
- **Lighthouse CI budgets** — run Lighthouse in CI with perf/SEO/a11y budgets so scores can't
  silently regress; folds into the accessibility pass below. Mindi requested 2026-07-03.
- **Pin the mindiweik.com changelog entry** — the site's project entry dates off its own
  repo's `pushedAt`, which bumps on every deploy, so "update · mindiweik.com" floats near
  the top of the changelog dated "today". Mindi's lean: pin it with `lastUpdated: 2026-06-30`
  (the official launch date) in `src/content/projects/mindiweik-site.md`; shipping as-is
  first to observe. Noted 2026-07-03.
- **Project page OG descriptions** — ProjectLayout doesn't pass a description to BaseLayout,
  so project pages share the generic site OG description instead of their blurb. Matches the
  preexisting pattern on article/episode layouts, so fix as a site-wide description pass.
  From final review 2026-07-03.
- **Accessibility pass** — audit + fixes across the site. Mindi requested 2026-07-02.
  - **Baseline shipped 2026-07-03 (PR #11, `chore/a11y-audit`):** skip-to-content link +
    `id="main-content"` on `<main>` (WCAG 2.4.1); global `:focus-visible` outline (2.4.7);
    `aria-current="page"` on active nav link (1.4.1); `prefers-reduced-motion` media query
    (2.3.3); labeled header/footer nav landmarks (1.3.1). Verified in built `dist/`.
  - **Still open:** color contrast (accent-on-dark chips + muted text, incl. the `opacity:0.6`
    inactive nav links); heading order audit; alt text sweep (ties into the images pass +
    `og:image:alt` below); keyboard nav on cards; run Lighthouse/axe as the baseline
    (ties into the Lighthouse CI budgets item above).
- **Comments** — comment capability on posts/episodes. Static-site-friendly options to evaluate:
  giscus (GitHub Discussions-backed, free, no ads, matches the dev audience), utterances
  (GitHub Issues), or a hosted service. Mindi requested 2026-07-02.
- **Email subscription** — newsletter signup so readers get new posts/episodes by email
  (replaces the old Substack subscribe). Options to evaluate: Buttondown (indie-friendly,
  RSS-to-email automation fits a static site), Kit/ConvertKit, or Mailerlite; site already
  has RSS+sitemap to feed it. Mindi requested 2026-07-02.

- **OG card niceties (deferred from social share cards, 2026-07-03)** — three minors from the
  final review, none urgent: (1) `og:image:alt` for accessibility (fold into the accessibility
  pass); (2) `og:image:width/height` are hardcoded to the zone-card dims even when a post sets
  a custom `ogImage` (blast radius one post, ratio is what matters); (3) the tagline in
  `scripts/generate-og-cards.mjs` duplicates `site.ts` without a source comment. Also open:
  Hostinger CDN image optimization serves the cards at 1600×840 instead of the full 2400×1260 —
  fine today; hPanel toggle exists if full-res ever matters.

## Resolved

- ~~**Linting + formatting**~~ -> shipped 2026-07-03. ESLint flat config (`typescript-eslint`
  recommended + `eslint-plugin-astro`) covering `.astro`/`.ts`/`.mjs`, and Prettier
  (`prettier-plugin-astro` + `prettier-plugin-tailwindcss`; single-quote, 100-col, matches the
  existing style). Scripts: `lint`, `lint:fix`, `format`, `format:check`. Enforced three ways:
  `lint.yml` (ESLint + Prettier check + tests on push/PR), plus husky + lint-staged pre-commit
  (fix + format staged files only). One-time repo-wide `prettier --write` applied as its own
  commit. Config choices worth knowing: `no-explicit-any` is `warn` (pragmatic uses in test
  mocks + the getCollection-shape type); `no-undef` is off for `.astro` (TS resolves ambient
  Astro globals); blog `.md` files use `embeddedLanguageFormatting: off` so code samples are
  never rewritten; `BaseHead.astro` is prettier-ignored (upstream prettier-plugin-astro bug
  parsing the inline gtag `define:vars` script — ESLint still lints it). `docs/superpowers/`
  and `scripts/fixtures/` are prettier-ignored (embedded fragments / byte-exact fixtures).
- ~~**Post-deploy smoke test**~~ -> SHIPPED 2026-07-03; false-alarm hardened same day.
  `scripts/smoke-test.mjs` (+ unit tests) runs as the `smoke-test` job in `deploy.yml`:
  fetches the five prod URLs, asserts 200 + the `mindiweik` marker on both homepages, retries
  5x/10s for FTP/CDN propagation lag. The 7/3 false positive (Hostinger 403'd the runner IP on
  ALL urls while the site was fine from a residential IP) is fixed two ways: (1) send a
  browser-ish `User-Agent`/`Accept` so the runner reads less like a bot; (2) classify a uniform
  403/429 across every URL as INCONCLUSIVE (warn, exit 0) instead of failing the run; a real
  breakage still fails loudly (any 404/500/timeout, a 200 missing the marker, or a mixed
  pass/block result). Separately, raised the FTP-Deploy-Action timeout 30s->120s on all three
  uploads to absorb the intermittent "Failed to connect... via FTP" deploy drops.
- ~~**Dependabot**~~ -> shipped 2026-07-03. `.github/dependabot.yml` covers npm +
  github-actions, weekly (Mon 09:00 America/Denver). Grouping: npm minor/patch bundled,
  npm majors bundled separately for deliberate review, all github-actions (incl. majors)
  bundled since first-party actions rarely break. First scan opened PRs #5-#8 (all merged).
  Repo `dependencies` + `github-actions` labels created. Remaining (manual, one toggle):
  enable **Dependabot security updates** under Settings > Code security for CVE-driven PRs —
  the config file only does version updates.
- ~~**Social sharing preview images**~~ -> SHIPPED 2026-07-03. Five zone-colored OG cards
  (checked-in satori script, `npm run og:cards`, rendered at 2x for retina crispness) in
  `public/og/`; `BaseHead` emits absolute `og:image` + `twitter:card` with fallback chain
  (opt-in `ogImage` frontmatter -> zone card -> default); fixed the og:description bug
  (article/episode/speaking pages emitted the site tagline). Card URLs carry `?v=N` — bump
  `OG_CARD_VERSION` in `BaseHead.astro` whenever regenerating (Hostinger CDN caches PNGs 7
  days). Spec + plan in `docs/superpowers/`. Remaining: LinkedIn Post Inspector re-scrape on
  already-shared URLs (Mindi).
- ~~**About copy**~~ -> done 2026-07-03. Real bio + the crew replaced the placeholder.
- ~~**Social links**~~ -> done 2026-07-03. Mindi's socials added.
- ~~**Inline code styling**~~ -> done 2026-07-03. Inline `code` spans visually distinct in prose.
- ~~**Projects revamp**~~ -> shipped 2026-07-03. Five projects (Audition Cat ★,
  Drip Dash, mindiweik.com, catz4life, prettykitties), each with a detail page
  (markdown body via ProjectLayout, same pattern as blog). Cards navigate
  internally; the `#` fallback and the synthesized changelog dates are gone.
  Changelog project entries are type `update`, dated lastUpdated (manual, for
  Audition Cat milestones) -> GitHub pushedAt (build-time fetch, fresh daily via
  cron) -> Jan 1 of `since`. Screenshots pending from Mindi (image/imageAlt
  fields are wired). GitLab API for AC = deliberately skipped.
- ~~**Smart 404**~~ -> shipped 2026-07-02. Build-time route list (isVisible-filtered, so drafts
  never leak) inlined into 404.astro; client-side fuzzy match (token overlap + Levenshtein on
  the last segment, section words excluded) renders up to 5 "did you mean" buttons showing
  post titles. No close match = section stays hidden.
- ~~**Consistent title casing**~~ -> done 2026-07-02. Convention: all lowercase across the
  board (titles already were; 303 in-body headings normalized across 51 files). Preserved: the
  pronoun I, `code` spans, link URLs, the [WIP] mark, code-fence contents. Heading scale also
  bumped (h2 1.65 / h3 1.3 / h4 1.1rem) so levels read distinctly without casing cues.
- ~~**Internal cross-links point to old paths**~~ -> done 2026-07-02. Full validation pass:
  every internal link in content checked against the built dist — zero broken. Last straggler
  (`/show-notes-tech-podcast` in v1-0-0-release-notes) rewritten to `/podcast`. The
  wip-podcast.com root link in why-i-rebuilt-my-site is intentional (refers to the domain).
- ~~**Inline links duplicating link buttons**~~ -> verified clean 2026-07-02: no
  podcast/speaking body repeats a frontmatter button URL (scripted check).
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
