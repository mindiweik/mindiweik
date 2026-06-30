# mindiweik.com

Personal site for Mindi Weik. Astro static site, dark-first, deploys to mindiweik.com.

## Run it
- `npm run dev` - dev server
- `npm run build` - static build to `dist/`
- `npm test` - Vitest (lib logic)
- `npx astro check` - type + content schema check

## Design system (read before touching styles)
- **Color is wayfinding.** Four zones, each a role-named token in `src/styles/global.css`:
  `--accent-blog` (blue, also `--accent-primary`/brand), `--accent-podcast` (pink),
  `--accent-speaking` (green), `--accent-projects` (amber).
- **Accent-as-fill rule (the important one):** accents are used as FILLS - chips, bars,
  dots, underlines, borders - with dark ink (`--ink`) on top. NEVER use an accent as small
  colored text on the canvas. This is what keeps one hex working in both dark and light.
- **Tokens are role-named, never hue-named.** Change a color = change one value in
  `global.css`. Do not introduce `--accent-blue` etc.
- **No hardcoded colors in components.** Always reference a token.
- `src/lib/zones.ts` is the single source of truth mapping a zone to its label, route, and
  color token. Add or change a zone there.
- **Type roles:** Space Grotesk (display headlines), JetBrains Mono (UI furniture: chips,
  nav, breadcrumbs, code, timestamps), Inter (body/prose).

## Conventions
- Content lives in `src/content/{blog,podcast,speaking,projects}/`. Schemas in
  `src/content.config.ts`. Blog posts are `.mdx` so components embed inline.
- Episodes use a `v1.0.x` version as their ID/badge; the home `// changelog` mixes all
  collections via `src/lib/collections.ts` (`getChangelog`).
- Podcast supports record/archive mode via `SITE.podcast.status` in `src/config/site.ts`.
- Site-wide values (Ko-fi handle, nav, metadata) live in `src/config/site.ts`.
- Theming: ships dark-only but is theming-ready. `data-theme="dark"` on `<html>`; light
  mode (v1.1) overrides only canvas tokens, not accents.

## Writing rules (Mindi's voice)
- Never use emdashes.
- Sentence case for all headings except the H1.

## Design decisions
See the spec (in the MARVIN repo): `docs/superpowers/specs/2026-06-29-mindiweik-site-rebuild-design.md`.
