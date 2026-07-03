# dev.mindiweik.com Preview Environment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A password-protected preview at dev.mindiweik.com that renders draft + scheduled posts (with their dashed chips) on every push and daily cron rebuild.

**Architecture:** Second Astro build in the existing deploy workflow with `PUBLIC_SHOW_DRAFTS=true` and `DEPLOY_SITE=https://dev.mindiweik.com`, FTP'd to the subdomain folder nested inside the prod webroot. Visibility gate (`isVisible`) and chip both key off a new shared `showUnpublished()` helper. Auth is Hostinger hPanel basic auth (manual, after first deploy).

**Tech Stack:** Astro 5 static build, vitest, GitHub Actions, SamKirkland/FTP-Deploy-Action@v4.3.5, Hostinger shared hosting.

**Spec:** `docs/superpowers/specs/2026-07-02-dev-subdomain-preview-design.md`

## Global Constraints

- Repo: `/Users/mindiweik/Desktop/mindiweik`, branch `main` (site convention: content/infra goes straight to main; every push deploys)
- No emdashes in any prose/comments (Mindi's writing rule)
- No Co-Authored-By trailers on commits
- `publishState` stays pure and untouched
- Preview FTP target: `server-dir: /domains/mindiweik.com/public_html/dev/`
- `import.meta.env` values are strings for PUBLIC_* vars: compare `=== 'true'`
- FTP-Deploy-Action `exclude:` REPLACES its defaults, so restate `**/.git*`, `**/.git*/**`, `**/node_modules/**` wherever exclude is added
- Do NOT push until Task 5 (each push triggers a live deploy)

---

### Task 1: `showUnpublished()` helper + `isVisible` preview mode

**Files:**
- Modify: `src/lib/publish.ts:29-34` (the `isVisible` block)
- Test: `src/lib/publish.test.ts`

**Interfaces:**
- Produces: `showUnpublished(env?: { DEV?: boolean; PUBLIC_SHOW_DRAFTS?: string }): boolean` exported from `src/lib/publish.ts`, defaulting `env` to `import.meta.env`. Task 2 imports it.
- `isVisible` signature unchanged.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/publish.test.ts` (add `showUnpublished` to the existing import from `'./publish'`):

```ts
describe('showUnpublished', () => {
  it('is true in the dev server', () => {
    expect(showUnpublished({ DEV: true })).toBe(true);
  });

  it('is true for a preview build (PUBLIC_SHOW_DRAFTS=true)', () => {
    expect(showUnpublished({ DEV: false, PUBLIC_SHOW_DRAFTS: 'true' })).toBe(true);
  });

  it('is false for a plain prod build', () => {
    expect(showUnpublished({ DEV: false })).toBe(false);
  });

  it('requires the exact string "true"', () => {
    expect(showUnpublished({ DEV: false, PUBLIC_SHOW_DRAFTS: '1' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/mindiweik/Desktop/mindiweik && npx vitest run src/lib/publish.test.ts`
Expected: FAIL — `showUnpublished` is not exported.

- [ ] **Step 3: Implement**

In `src/lib/publish.ts`, replace the `isVisible` block (lines 29-34) with:

```ts
// True when unpublished entries should render: the dev server, or a
// PUBLIC_SHOW_DRAFTS=true build (the dev.mindiweik.com preview).
// Env is injectable for tests; import.meta.env values are strings.
export function showUnpublished(
  env: { DEV?: boolean; PUBLIC_SHOW_DRAFTS?: string } = import.meta.env,
): boolean {
  return !!env.DEV || env.PUBLIC_SHOW_DRAFTS === 'true';
}

// Dev + preview render everything; prod builds evaluate "now" at build time,
// so the daily cron rebuild is what releases scheduled entries.
export function isVisible(entry: { data: Publishable }): boolean {
  if (showUnpublished()) return true;
  return publishState(entry.data, new Date()) === 'published';
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: PASS, 53 tests (49 existing + 4 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/publish.ts src/lib/publish.test.ts
git commit -m "feat: showUnpublished helper for preview builds"
```

---

### Task 2: Chip renders on preview builds

**Files:**
- Modify: `src/components/content/PublishStateChip.astro:7-9`

**Interfaces:**
- Consumes: `showUnpublished()` from Task 1.

- [ ] **Step 1: Update the gate**

Replace lines 7-9 of `src/components/content/PublishStateChip.astro`:

```ts
// Dev + preview builds only: the real prod build filters unpublished entries
// out entirely, so this never renders there. The dashed border marks
// "not live yet" at a glance.
const show = showUnpublished() && state !== 'published';
```

and add to the imports in the frontmatter:

```ts
import { showUnpublished } from '../../lib/publish.ts';
```

- [ ] **Step 2: Verify with a preview build locally**

Run: `PUBLIC_SHOW_DRAFTS=true DEPLOY_SITE=https://dev.mindiweik.com npm run build && grep -l "dashed" dist/blog/index.html && ls dist/blog/ | grep tag-it-and-ship-it`
Expected: `dist/blog/index.html` matches (chip markup present) and the draft post directory exists.

Then: `npm run build && ls dist/blog/ | grep tag-it-and-ship-it; echo "exit=$?"`
Expected: no match, `exit=1` — plain build still excludes drafts. (This also resets `dist/` to prod content.)

- [ ] **Step 3: Commit**

```bash
git add src/components/content/PublishStateChip.astro
git commit -m "feat: publish-state chips render on preview builds"
```

---

### Task 3: Overridable site URL

**Files:**
- Modify: `astro.config.mjs:8`

- [ ] **Step 1: Make `site` env-driven**

Replace line 8 of `astro.config.mjs`:

```js
site: process.env.DEPLOY_SITE ?? 'https://mindiweik.com',
```

- [ ] **Step 2: Verify both modes**

Run: `DEPLOY_SITE=https://dev.mindiweik.com npm run build && grep -o 'https://dev.mindiweik.com[^"]*' dist/sitemap-index.xml | head -1`
Expected: a `https://dev.mindiweik.com/...` URL.

Run: `npm run build && grep -c 'https://dev.mindiweik.com' dist/sitemap-index.xml; echo "exit=$?"`
Expected: `0` matches, `exit=1` — default build unchanged.

- [ ] **Step 3: Commit**

```bash
git add astro.config.mjs
git commit -m "feat: DEPLOY_SITE env override for site URL"
```

---

### Task 4: Deploy workflow preview steps

**Files:**
- Modify: `.github/workflows/deploy.yml`

- [ ] **Step 1: Protect the nested dev folder from the prod sync**

In the existing "Deploy to Hostinger via FTP" step, add `exclude` (restating action defaults):

```yaml
      - name: Deploy to Hostinger via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/
          server-dir: /domains/mindiweik.com/public_html/
          # dev/ is the dev.mindiweik.com preview (nested subdomain folder);
          # the prod sync must never delete or overwrite it.
          exclude: |
            **/.git*
            **/.git*/**
            **/node_modules/**
            dev/**
```

- [ ] **Step 2: Append the preview build + deploy steps**

Add at the end of the job (after the wip-podcast steps; the preview build reuses `./dist/`, which is safe because the prod upload already finished):

```yaml
      # dev.mindiweik.com preview: same site with draft + scheduled entries
      # visible (dashed chips). Protected by hPanel basic auth on the dev/
      # folder; .htaccess/.htpasswd are excluded so deploys never remove it.
      - name: Build dev preview (drafts + scheduled visible)
        run: npm run build
        env:
          PUBLIC_SHOW_DRAFTS: 'true'
          DEPLOY_SITE: 'https://dev.mindiweik.com'

      - name: Block crawlers on dev preview
        run: printf 'User-agent: *\nDisallow: /\n' > dist/robots.txt

      - name: Deploy dev preview via FTP
        uses: SamKirkland/FTP-Deploy-Action@v4.3.5
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./dist/
          server-dir: /domains/mindiweik.com/public_html/dev/
          exclude: |
            **/.git*
            **/.git*/**
            **/node_modules/**
            **/.htaccess
            **/.htpasswd*
```

- [ ] **Step 3: Validate YAML**

Run: `npx yaml-lint .github/workflows/deploy.yml 2>/dev/null || node -e "const yaml=require('js-yaml') ?? null" 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('yaml ok')"`
Expected: `yaml ok` (python fallback is the reliable one).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat: dev.mindiweik.com preview build + FTP deploy"
```

---

### Task 5: Ship and verify live

- [ ] **Step 1: Push (this deploys)**

```bash
git push
```

(Also carries the earlier local docs commit with the spec.)

- [ ] **Step 2: Watch the workflow**

Run: `gh run list --limit 1` then `gh run watch <run-id> --exit-status`
Expected: success. FTP has flaked once before; a single rerun has fixed it.

- [ ] **Step 3: Verify live behavior**

```bash
# Preview serves drafts (before auth is enabled):
curl -sL -o /dev/null -w "dev draft: %{http_code}\n" https://dev.mindiweik.com/blog/tag-it-and-ship-it-building-a-cd-pipeline-for-a-startup-in-alpha
# Prod still hides them:
curl -sL -o /dev/null -w "prod draft: %{http_code}\n" https://mindiweik.com/blog/tag-it-and-ship-it-building-a-cd-pipeline-for-a-startup-in-alpha
# Crawler block:
curl -sL https://dev.mindiweik.com/robots.txt
```

Expected: `dev draft: 200`, `prod draft: 404`, robots.txt = `User-agent: *` / `Disallow: /`.
(If DNS/SSL for the new subdomain hasn't propagated yet, retry after a few minutes.)

- [ ] **Step 4: Hand off to Mindi**

Mindi enables hPanel password protection on the `dev` folder, then re-verify:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://dev.mindiweik.com/
```

Expected: `401` without credentials.
