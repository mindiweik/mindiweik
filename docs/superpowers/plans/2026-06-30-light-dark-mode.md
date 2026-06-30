# Light/Dark Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-toggleable light theme to mindiweik.com via a small sun/moon icon in the header and footer, with the choice remembered across visits and dark as the default.

**Architecture:** A single `data-theme` attribute on `<html>` is the source of truth. CSS overrides only the canvas tokens under `[data-theme="light"]`; accents are unchanged. Theme-resolution logic lives in a pure, unit-tested `src/lib/theme.ts`. A bundled toggle script (reused by both toggle instances) flips the attribute and persists to `localStorage`; a standalone inline `is:inline` script applies the stored theme before first paint to avoid a flash.

**Tech Stack:** Astro 7 (static), TypeScript, Tailwind v4 (`@theme` + CSS custom properties), vitest (node env).

## Global Constraints

- Astro version is 7 (not 5). Do not downgrade.
- Dark is the default theme on every first visit. No `prefers-color-scheme` detection.
- `localStorage` key is exactly `theme`; valid values are exactly `dark` and `light`.
- Accent tokens and `--ink` are unchanged across themes. Only canvas tokens differ.
- Commits must NOT include `Co-Authored-By` trailers.
- `git push` to `main` triggers the Hostinger deploy. The final push in this plan deploys live.
- Keep the build green (`npm run build`) and tests green (`npm test`) at every commit.

---

### Task 1: Pure theme logic module (`src/lib/theme.ts`)

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Theme = 'dark' | 'light'`
  - `const THEMES: readonly Theme[]`
  - `const STORAGE_KEY: 'theme'`
  - `const DEFAULT_THEME: Theme` (value `'dark'`)
  - `function isTheme(value: unknown): value is Theme`
  - `function resolveTheme(stored: unknown): Theme` — returns stored if valid, else `DEFAULT_THEME`
  - `function nextTheme(current: Theme): Theme` — toggles dark<->light

- [ ] **Step 1: Write the failing test**

Create `src/lib/theme.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveTheme, nextTheme, isTheme, DEFAULT_THEME, STORAGE_KEY } from './theme.ts';

describe('resolveTheme', () => {
  it('returns the stored theme when valid', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('dark')).toBe('dark');
  });
  it('falls back to dark for missing or garbage values', () => {
    expect(resolveTheme(null)).toBe('dark');
    expect(resolveTheme('')).toBe('dark');
    expect(resolveTheme('blue')).toBe('dark');
    expect(resolveTheme(undefined)).toBe('dark');
  });
});

describe('nextTheme', () => {
  it('toggles between dark and light', () => {
    expect(nextTheme('dark')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
  });
});

describe('isTheme', () => {
  it('guards valid theme strings only', () => {
    expect(isTheme('dark')).toBe(true);
    expect(isTheme('light')).toBe(true);
    expect(isTheme('x')).toBe(false);
    expect(isTheme(null)).toBe(false);
  });
});

describe('constants', () => {
  it('default is dark and storage key is "theme"', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(STORAGE_KEY).toBe('theme');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- theme`
Expected: FAIL — cannot resolve module `./theme.ts` (file not created yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/theme.ts`:

```ts
export const THEMES = ['dark', 'light'] as const;
export type Theme = (typeof THEMES)[number];

export const STORAGE_KEY = 'theme';
export const DEFAULT_THEME: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return value === 'dark' || value === 'light';
}

export function resolveTheme(stored: unknown): Theme {
  return isTheme(stored) ? stored : DEFAULT_THEME;
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- theme`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat: add pure theme resolution module with tests"
```

---

### Task 2: Light-mode canvas tokens + theme-aware color-scheme (`src/styles/global.css`)

**Files:**
- Modify: `src/styles/global.css:13-32` (the token blocks + `color-scheme` line)

**Interfaces:**
- Consumes: nothing (pure CSS).
- Produces: a `[data-theme="light"]` selector overriding canvas tokens; `color-scheme` now keyed on theme. Also produces the icon-visibility rules the toggle (Task 3) relies on: class names `.theme-toggle`, `.icon-sun`, `.icon-moon`.

- [ ] **Step 1: Add the light-mode token block and theme-aware color-scheme**

In `src/styles/global.css`, replace the comment + dark block + `html { color-scheme: dark; }`
(currently lines 13-32) with:

```css
/* Canvas + accent tokens. Dark is the default theme; light is opt-in via the
   header/footer toggle. The [data-theme="light"] block overrides ONLY canvas
   tokens. Accent tokens (and --ink) are mode-independent thanks to the fill rule. */
:root,
[data-theme="dark"] {
  --bg: #0B0E14;
  --surface: #11151F;
  --border: rgba(255, 255, 255, 0.10);
  --text: #ECECF1;
  --text-muted: rgba(236, 236, 241, 0.60);
  --ink: #0B0E14; /* dark ink used as text ON accent fills */

  --accent-blog: #6E7BFF;
  --accent-primary: var(--accent-blog);
  --accent-podcast: #FF5C85;
  --accent-speaking: #34D399;
  --accent-projects: #FF9F45;
}

[data-theme="light"] {
  --bg: #FAFAF7;
  --surface: #FFFFFF;
  --border: rgba(11, 14, 20, 0.12);
  --text: #1A1D24;
  --text-muted: rgba(26, 29, 36, 0.62);
  /* --ink unchanged: still dark ink on bright accent fills */
}

[data-theme="dark"] { color-scheme: dark; }
[data-theme="light"] { color-scheme: light; }

/* Theme toggle: show the icon for the destination theme.
   Dark now -> show sun (go light). Light now -> show moon (go dark). */
.theme-toggle .icon-sun,
.theme-toggle .icon-moon { display: none; }
[data-theme="dark"] .theme-toggle .icon-sun { display: inline-flex; }
[data-theme="light"] .theme-toggle .icon-moon { display: inline-flex; }
```

- [ ] **Step 2: Verify the build still succeeds**

Run: `npm run build`
Expected: "Complete!" with 12 pages, no errors.

- [ ] **Step 3: Manually verify light tokens apply**

With `npm run dev` running, in the browser devtools console run:
`document.documentElement.setAttribute('data-theme','light')`
Expected: background turns near-white (`#FAFAF7`), text turns dark, accent cards stay the
same bright colors with dark text. Then set it back to `'dark'` and confirm it returns.

- [ ] **Step 4: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add light-mode canvas tokens and theme-aware color-scheme"
```

---

### Task 3: ThemeToggle component + FOUC resolver (`ThemeToggle.astro`, `BaseLayout.astro`)

**Files:**
- Create: `src/components/layout/ThemeToggle.astro`
- Modify: `src/layouts/BaseLayout.astro:13` (replace the hardcoded inline script)

**Interfaces:**
- Consumes: `nextTheme`, `resolveTheme`, `STORAGE_KEY` from `src/lib/theme.ts` (Task 1);
  the `.theme-toggle` / `.icon-sun` / `.icon-moon` CSS from Task 2.
- Produces: a `<ThemeToggle />` component (Task 4 mounts it in Header + Footer).

- [ ] **Step 1: Create the ThemeToggle component**

Create `src/components/layout/ThemeToggle.astro`:

```astro
---
// Small sun/moon theme toggle. Icon visibility is driven by the [data-theme]
// attribute on <html> (see global.css), so both instances stay in sync and
// render the correct icon on first paint. Used in Header and Footer.
---
<button
  type="button"
  class="theme-toggle"
  aria-label="Toggle light/dark theme"
  title="Toggle light/dark theme"
  style="display:inline-flex;align-items:center;justify-content:center;background:none;border:none;padding:0.15rem;margin:0;cursor:pointer;color:var(--text-muted);line-height:0"
>
  <svg class="icon-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4"></circle>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
  </svg>
  <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
  </svg>
</button>

<script>
  import { nextTheme, resolveTheme, STORAGE_KEY } from '../../lib/theme.ts';

  function currentTheme() {
    return resolveTheme(document.documentElement.getAttribute('data-theme'));
  }

  document.querySelectorAll('.theme-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const next = nextTheme(currentTheme());
      document.documentElement.setAttribute('data-theme', next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* storage blocked: theme still flips for this session */
      }
    });
  });
</script>
```

Note: the `<script>` is a bundled module (NOT `is:inline`), so it can import from
`theme.ts`. Astro dedupes the identical script across the two component instances, so
`querySelectorAll('.theme-toggle')` wires up both buttons exactly once.

- [ ] **Step 2: Replace the FOUC guard in BaseLayout**

In `src/layouts/BaseLayout.astro`, replace line 13:

```astro
    <script is:inline>document.documentElement.setAttribute('data-theme', 'dark');</script>
```

with a resolver that applies the stored theme before paint (kept standalone — `is:inline`
scripts are not bundled and cannot import, so the dark default is duplicated here by design):

```astro
    <script is:inline>
      (function () {
        try {
          var t = localStorage.getItem('theme');
          if (t === 'light' || t === 'dark') {
            document.documentElement.setAttribute('data-theme', t);
          }
        } catch (e) {}
      })();
    </script>
```

Leave `<html lang="en" data-theme="dark">` (line 10) as-is — dark stays the SSR default.

- [ ] **Step 3: Verify the build succeeds**

Run: `npm run build`
Expected: "Complete!" with 12 pages, no errors. (The component is not yet mounted anywhere,
so there is no visible change yet — this step only confirms the new files compile.)

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/ThemeToggle.astro src/layouts/BaseLayout.astro
git commit -m "feat: add ThemeToggle component and FOUC-safe theme resolver"
```

---

### Task 4: Mount the toggle in Header + Footer, housekeeping, ship

**Files:**
- Modify: `src/components/layout/Header.astro`
- Modify: `src/components/layout/Footer.astro`
- Modify: `docs/followups.md` (remove the light-mode entry)

**Interfaces:**
- Consumes: `<ThemeToggle />` from Task 3.
- Produces: the shipped feature.

- [ ] **Step 1: Add the toggle to the Header**

In `src/components/layout/Header.astro`, add the import and place the toggle at the end of the
nav row (it sits top-right because the brand link has `margin-right:auto`):

Frontmatter (after line 2 `import { SITE }...`):
```astro
import ThemeToggle from './ThemeToggle.astro';
```

After the `{SITE.nav.map(...)}` block and before `</header>`:
```astro
  <ThemeToggle />
```

- [ ] **Step 2: Add the toggle to the Footer**

In `src/components/layout/Footer.astro`, add the import and place the toggle at the end of the
footer row:

Frontmatter (after line 3 `import KofiLink...`):
```astro
import ThemeToggle from './ThemeToggle.astro';
```

After `<KofiLink />` and before `</footer>`:
```astro
  <ThemeToggle />
```

- [ ] **Step 3: Remove the resolved follow-up**

In `docs/followups.md`, delete the light-mode bullet under "Design / consistency":

```
- **Light mode (v1.1):** add a `[data-theme="light"]` block in `global.css` overriding only the
  canvas tokens, plus a visible toggle. Accent tokens stay as-is (fill rule).
```

- [ ] **Step 4: Run tests and build**

Run: `npm test && npm run build`
Expected: tests PASS (theme tests + existing 5), build "Complete!" with 12 pages.

- [ ] **Step 5: Manual end-to-end verification (`npm run dev`)**

1. First load (clear `localStorage` first via devtools): page is **dark**; both header and
   footer show the **sun** icon.
2. Click the header toggle: page flips to **light**; BOTH icons change to the **moon**.
3. Reload: still **light** (persisted), no flash of dark first.
4. Click the footer toggle: flips to **dark**, persisted; reload confirms.
5. Visit a blog post and a podcast episode in light mode: prose text and accent elements are
   legible; accent fills still readable with dark ink.
6. Visit a 404 (`/nope`): renders correctly in the active theme.

- [ ] **Step 6: Commit and push (this deploys live)**

```bash
git add src/components/layout/Header.astro src/components/layout/Footer.astro docs/followups.md
git commit -m "feat: mount theme toggle in header and footer, ship light mode"
git push origin main
```

- [ ] **Step 7: Verify the deploy and live behavior**

Run: `gh run list -R mindiweik/mindiweik --limit 1`
Wait for success, then load https://mindiweik.com, toggle the theme, reload, and confirm
persistence on the live site.

---

## Self-Review

**Spec coverage:**
- Dark default, no system-pref → Task 1 `DEFAULT_THEME='dark'` + Task 3 inline resolver (no `prefers-color-scheme` branch). ✓
- localStorage key `theme` → Task 1 `STORAGE_KEY`, used in Tasks 3. ✓
- Toggle in both header + footer, synced → Task 4 mounts both; sync via attribute-driven CSS (Task 2) + `querySelectorAll` (Task 3). ✓
- Icon = destination (sun in dark, moon in light) → Task 2 CSS rules. ✓
- `[data-theme="light"]` overrides only canvas tokens; accents + `--ink` unchanged → Task 2. ✓
- FOUC prevention via inline pre-paint script → Task 3 Step 2. ✓
- Edge cases (no JS, blocked storage, garbage value) → Task 1 `resolveTheme` + Task 3 try/catch + inline guard. ✓
- Housekeeping (global.css comment, followups entry) → Task 2 Step 1 comment + Task 4 Step 3. ✓
- Testing (build, vitest, manual) → Tasks 1/4. ✓

**Placeholder scan:** No TBD/TODO; all code blocks complete. ✓

**Type consistency:** `Theme`, `resolveTheme`, `nextTheme`, `isTheme`, `STORAGE_KEY`,
`DEFAULT_THEME` named identically across Tasks 1 and 3. CSS class names `.theme-toggle`,
`.icon-sun`, `.icon-moon` identical across Tasks 2 and 3. ✓
