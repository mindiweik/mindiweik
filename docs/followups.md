# Follow-ups (deferred from the scaffold task)

These are known, intentionally-deferred items from the initial scaffold. None block the
scaffold being "done." Most belong with the content-migration or light-mode (v1.1) work.

## Design / consistency
- **Episode chapter timestamps** render in accent-pink small text (`src/layouts/EpisodeLayout.astro`).
  This is the one spot still using accent-colored small text after zone labels + changelog tags
  were converted to fills. Decide: ratify as-is, or convert to `--text-muted` / a small dot for
  full consistency with the accent-as-fill rule.
- **Light mode (v1.1):** add a `[data-theme="light"]` block in `global.css` overriding only the
  canvas tokens, plus a visible toggle. Accent tokens stay as-is (fill rule).

## Content / data
- **Projects changelog date** is synthesized from `order` -> a Jan-2026 date in
  `src/lib/collections.ts`. Replace with real ship dates when projects get them; add a test for
  the `order > 0` branch.
- **Changelog fragment links** to `/speaking#id` and `/projects#id` are inert (EntryCard has no
  matching `id`). Thread an `id` onto `EntryCard`'s `<a>` if per-entry anchors are wanted.
- **Projects with no url** currently link to `#`. Give them real links or a detail page.
- **Podcast archive copy** hardcodes "two seasons" (`src/pages/podcast/index.astro`); derive from
  `seasons.length` when `SITE.podcast.status` flips to complete/archived.
- **About copy** is placeholder; real bio + the crew during content work.

## Hygiene
- Swap `import { z } from 'astro:content'` to `import { z } from 'zod'` in `src/content.config.ts`
  to clear ~55 TS deprecation hints.
- `KofiLink` / `KofiCard` / episode external links use `rel="noopener"`; consider `noopener noreferrer`.
- `ZONE_ORDER` in `src/lib/zones.ts` is currently unused (home hardcodes order); wire it in or drop it.
- Docs/spec call this "Astro 5"; the toolchain is actually Astro 7 (latest). Reconcile the wording.
