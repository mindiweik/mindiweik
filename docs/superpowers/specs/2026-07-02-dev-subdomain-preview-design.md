# dev.mindiweik.com preview environment design

**Date:** 2026-07-02
**Status:** Approved (pending Mindi's spec review)

## Goal

A password-protected preview of the full site at `dev.mindiweik.com` where draft and scheduled posts render (marked with the existing dashed chips), so Mindi can review content on any device before it goes live on mindiweik.com. Always current: rebuilt on every push to main and by the daily 13:00 UTC cron.

## Decisions made

- Subdomain name: `dev.mindiweik.com` (Mindi's pick over `staging.`)
- Auth: HTTP basic auth via Hostinger hPanel "Password Protect Directories" (no code, blocks crawlers, works on mobile). Fancier auth (Cloudflare Access etc.) rejected as overkill.
- Same repo, same deploy workflow: a second Astro build with a flag, uploaded to the subdomain folder. No new platform.

## Changes

### 1. `src/lib/publish.ts` — preview mode flag

Add a shared helper and use it in `isVisible`:

```ts
// True when unpublished entries should render (dev server, or a
// PUBLIC_SHOW_DRAFTS=true build for dev.mindiweik.com).
export function showUnpublished(): boolean {
  return import.meta.env.DEV || import.meta.env.PUBLIC_SHOW_DRAFTS === 'true';
}

export function isVisible(entry: { data: Publishable }): boolean {
  if (showUnpublished()) return true;
  return publishState(entry.data, new Date()) === 'published';
}
```

`publishState` stays pure/untouched. Existing tests keep passing; new tests cover the flag (TDD: test first). Note `import.meta.env` values are strings; compare to `'true'`.

### 2. `src/components/content/PublishStateChip.astro` — chip on preview builds

Replace the `import.meta.env.DEV` gate with the shared helper:

```ts
const show = showUnpublished() && state !== 'published';
```

Update the stale comment (it says "prod builds filter unpublished entries out entirely" — still true for the real prod build, but preview builds now render them with chips).

### 3. `astro.config.mjs` — overridable site URL

```js
site: process.env.DEPLOY_SITE ?? 'https://mindiweik.com',
```

Preview build sets `DEPLOY_SITE=https://dev.mindiweik.com` so canonical URLs, sitemap, and RSS self-links point at the subdomain instead of leaking preview URLs styled as prod (or vice versa).

### 4. `.github/workflows/deploy.yml` — preview build + third FTP target

After the existing prod deploy step (reusing `./dist/`, so it must run after prod's upload finishes):

```yaml
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

The `exclude` on `.htaccess`/`.htpasswd*` is load-bearing: hPanel's password protection writes an `.htaccess` into the folder, and without the exclusion the FTP sync would delete it (it removes server files not present locally), silently un-protecting the preview. Note: supplying `exclude` replaces the action's defaults, so the `.git*`/`node_modules` defaults are restated.

The robots.txt overwrite is belt-and-suspenders: basic auth already blocks crawlers; this covers any window where auth is misconfigured.

**Nested-folder consequences** (Mindi created the subdomain at `/public_html/dev`, inside the prod webroot):

- The existing **prod** FTP step gets `exclude` entries for `dev/**` (restating the action's defaults), so a main-site sync can never delete or overwrite the preview folder. The v4 action's sync-state tracking likely protects untracked folders already; the exclude makes it explicit and deliberate.
- The preview is also reachable at `https://mindiweik.com/dev/`. Basic auth protects the folder itself, so both hostnames prompt for credentials. The Disallow-all robots.txt lives inside the folder, and prod's own robots.txt is unaffected.

### 5. Mindi's manual steps (one-time, hPanel)

1. ~~Create subdomain `dev.mindiweik.com`~~ ✅ done 7/2 — hPanel reports `/home/u112789821/domains/mindiweik.com/public_html/dev` (= `/domains/mindiweik.com/public_html/dev/` from the FTP root)
2. After the first deploy, enable password protection on that folder (hPanel > password protect directories), pick username + password
3. Verify SSL provisioned for the subdomain (usually automatic)

## Error handling

- Preview build/deploy failure fails the workflow visibly (same as prod steps today). Prod deploy happens first, so a preview-only failure never blocks a prod release.
- If the subdomain folder path is wrong, the FTP step errors; nothing touches prod.

## Testing / verification

1. Unit: new publish.ts tests for `PUBLIC_SHOW_DRAFTS` behavior (existing suite: 49 tests stays green)
2. Local: `PUBLIC_SHOW_DRAFTS=true npm run build` renders drafts with chips into dist; plain `npm run build` still excludes them
3. Live: after push — dev.mindiweik.com prompts for auth; drafts (CD pipeline post) + scheduled posts (job search) visible with chips; prod unchanged (both still 404); dev robots.txt is Disallow-all

## Out of scope

- Per-branch/PR previews, Cloudflare/Netlify/Vercel, email-based auth
- Any change to prod visibility behavior or the cron release mechanism
