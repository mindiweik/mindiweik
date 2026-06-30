# Light/dark mode — design

**Date:** 2026-06-30
**Status:** Approved (design), pending spec review
**Scope:** Add a user-toggleable light theme to mindiweik.com. Dark stays the default.

## Goal

Let visitors switch between the existing dark theme and a new light theme via a small
sun/moon icon, remembered across visits. Dark remains the default on every first visit.

## Decisions (locked in brainstorming)

| Decision | Choice |
|----------|--------|
| Default theme | **Dark**, always, on first visit (not system-preference driven) |
| Persistence | Remembered in `localStorage` under key `theme`; overrides default on return |
| Toggle placement | **Both** header (top-right, after `about`) and footer; share one state |
| Icon semantics | Icon shows the **destination**: ☀️ sun when dark (→ light), 🌙 moon when light (→ dark) |
| Token strategy | Add `[data-theme="light"]` overriding **only canvas tokens**; accents unchanged |
| FOUC prevention | Inline `is:inline` script in `<head>` resolves theme before first paint |

## Architecture

The site already separates **canvas tokens** (`--bg`, `--surface`, `--border`, `--text`,
`--text-muted`, `--ink`) from **accent tokens** (the four zone colors). Accents are
mode-independent thanks to the fill rule (dark `--ink` text sits on bright accent fills and
reads well in both modes). So light mode only overrides the canvas tokens.

### 1. CSS — `src/styles/global.css`

Add a `[data-theme="light"]` block after the existing `:root, [data-theme="dark"]` block,
overriding only canvas tokens. Proposed light values (to be tuned during implementation):

```css
[data-theme="light"] {
  --bg: #FAFAF7;
  --surface: #FFFFFF;
  --border: rgba(11, 14, 20, 0.12);
  --text: #1A1D24;
  --text-muted: rgba(26, 29, 36, 0.62);
  --ink: #0B0E14; /* unchanged: still dark ink on accent fills */
}
```

Replace the static `html { color-scheme: dark; }` with theme-aware handling:
`[data-theme="dark"] { color-scheme: dark; }` and
`[data-theme="light"] { color-scheme: light; }` so native form controls / scrollbars match.

Accent tokens stay exactly as they are. `--ink` stays dark in both modes (it is the text
color used *on* accent fills, which remain saturated in both themes).

### 2. FOUC guard + theme resolution — `src/layouts/BaseLayout.astro`

- Keep `<html lang="en" data-theme="dark">` as the server-rendered default (correct for a
  dark-default site; prevents a flash for the common case and for no-JS visitors).
- Replace the hardcoded inline script (line 13) with a resolver that runs before paint:

```js
// is:inline — runs before first paint, no flash
(function () {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    }
    // else: leave the SSR default ('dark') in place
  } catch (e) {}
})();
```

No-JS / localStorage-blocked visitors get the dark default. No system-preference branch by
design (dark is always the first-visit default).

### 3. New component — `src/components/layout/ThemeToggle.astro`

A single reusable toggle, used in both Header and Footer. Responsibilities:

- Render a `<button>` with an accessible label (`aria-label="Toggle light/dark theme"`),
  containing both a sun and a moon inline SVG. CSS shows the correct one based on the
  ancestor `[data-theme]` value (sun visible in dark, moon visible in light) — so the icon
  is correct on first paint with zero JS flicker.
- An `is:inline` (or module) script wires the click: read current `data-theme`, flip it,
  set the attribute on `documentElement`, and write the new value to `localStorage`.
- Because the icon visibility is driven purely by the `[data-theme]` attribute in CSS, **both**
  toggle instances update visually in sync the instant the attribute flips — no per-instance
  state syncing needed.

Styling: small, unobtrusive, monospace-era aesthetic matching the header/footer. Sized to
sit inline with the nav links (header) and the footer row.

### 4. Integration — Header + Footer

- `src/components/layout/Header.astro`: add `<ThemeToggle />` at the end of the nav row
  (after the `about` link, top-right).
- `src/components/layout/Footer.astro`: add `<ThemeToggle />` to the footer row.

## Data flow

```
First visit:        SSR sets data-theme="dark" → inline script finds no stored value → stays dark
Toggle click:       button script flips data-theme on <html> + writes localStorage['theme']
                    → CSS re-resolves canvas tokens + swaps which icon is visible (both toggles)
Return visit:       inline script reads localStorage['theme'] → applies it before paint
```

Single source of truth: the `data-theme` attribute on `<html>`. CSS, both toggle icons, and
persistence all key off it.

## Edge cases / error handling

- **localStorage unavailable** (private mode, blocked): `try/catch` swallows; falls back to
  the dark default. Toggle still works for the session (attribute flips), just won't persist.
- **No JS:** dark default renders correctly; toggle is inert but page is fully usable.
- **Stored garbage value:** resolver only applies `'light'` or `'dark'`; anything else is
  ignored and the dark default stands.

## Testing

- Build passes (`npm run build`), no new TS/console errors.
- Manual (local `npm run dev`):
  - First load = dark; click toggle → light; both header + footer icons swap together.
  - Reload → light persists. Toggle back → dark persists.
  - Light mode: text/borders/surfaces legible; accent fills still readable with dark ink.
  - View-source / throttle: no flash of dark before light on a stored-light return visit.
- Spot-check representative pages: home, a blog post (prose.css), a podcast episode
  (EpisodeLayout accents), 404.

## Out of scope (YAGNI)

- System-preference (`prefers-color-scheme`) auto-detection — explicitly not wanted.
- Per-zone or multi-theme support beyond light/dark.
- Animated theme transitions (can revisit later if desired).

## Follow-up housekeeping

- Update the comment in `global.css` (currently says light mode is "v1.1 / not shipped")
  to reflect that it now ships.
- Remove the `docs/followups.md` light-mode entry once implemented.
