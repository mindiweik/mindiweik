# Follow-ups (deferred from the scaffold task)

These are known, intentionally-deferred items from the initial scaffold. None block the
scaffold being "done." Most belong with the content-migration or light-mode (v1.1) work.

## Content / data
- **Projects changelog date** is synthesized from `order` -> a Jan-2026 date in
  `src/lib/collections.ts`. Replace with real ship dates when projects get them; add a test for
  the `order > 0` branch.
- **Changelog fragment links** to `/speaking#id` and `/projects#id` are inert (EntryCard has no
  matching `id`). Thread an `id` onto `EntryCard`'s `<a>` if per-entry anchors are wanted.
- **Projects with no url** currently link to `#`. Give them real links or a detail page.
- **About copy** is placeholder; real bio + the crew during content work.

## Resolved
- ~~**Episode chapter timestamps** in accent-pink small text~~ -> converted to `--text-muted`
  for full accent-as-fill consistency (2026-06-30).
- ~~**Podcast archive copy** hardcoded "two seasons"~~ -> derived from `seasons.length`
  in `src/pages/podcast/index.astro` (2026-06-30).
