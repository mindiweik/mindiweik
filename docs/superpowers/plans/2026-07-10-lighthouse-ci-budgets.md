# Lighthouse CI budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Lighthouse CI check that audits 10 representative pages on every pull request and hard-fails if performance, accessibility, best-practices, or SEO drop below threshold.

**Architecture:** `@lhci/cli` runs `lhci autorun` against the built `./dist` (served locally by LHCI, so no network variance), taking the median of 3 runs per URL. Config lives in-repo (`lighthouserc.cjs`) and is reproducible locally via `npm run lhci`. A `pull_request`-only workflow makes it a required status check without ever gating the direct-to-main auto-deploy.

**Tech Stack:** Astro 7 static site, `@lhci/cli`, GitHub Actions, Node 22, npm.

## Global Constraints

- Node version in CI: **22**, with `cache: npm` on `actions/setup-node@v6`; checkout via `actions/checkout@v7` (match existing workflows).
- Dependency install in CI is always `npm ci`.
- New dependency: `@lhci/cli` as a **devDependency** only.
- The Astro build needs `GITHUB_TOKEN` in the environment (matches `lint.yml`'s build job).
- All four Lighthouse assertions are **error**-level (hard fail): performance `minScore 0.90`, accessibility `0.95`, best-practices `0.95`, seo `0.95`.
- The Lighthouse workflow runs on `pull_request` only (never `push`). It is meant to become a required status check via branch protection (manual owner step, out of code scope).
- No emdashes anywhere (repo prose-lint rule + author preference). Prettier runs on commit via husky; write files already-formatted.

---

### Task 1: Local LHCI config that runs green

**Files:**
- Modify: `package.json` (add devDependency + `lhci` script)
- Create: `lighthouserc.cjs`

**Interfaces:**
- Consumes: the built `./dist` directory from `npm run build`.
- Produces: `npm run lhci` command (runs `lhci autorun`) and `lighthouserc.cjs` config, both consumed by Task 2's workflow.

- [ ] **Step 1: Install `@lhci/cli` as a devDependency**

Run:
```bash
npm install --save-dev @lhci/cli
```
Expected: `@lhci/cli` appears under `devDependencies` in `package.json`; `package-lock.json` updates.

- [ ] **Step 2: Add the `lhci` npm script**

In `package.json`, add to `"scripts"` (alphabetical-ish, near the other quality scripts):
```json
"lhci": "lhci autorun",
```

- [ ] **Step 3: Create `lighthouserc.cjs`**

Create `lighthouserc.cjs` at the repo root with exactly:
```js
// Lighthouse CI config. Runs against the built ./dist (LHCI serves it locally,
// so scores are network-noise-free), takes the median of 3 runs per URL, and
// hard-fails if any audited page drops below the category thresholds.
// Runs in CI on pull_request (.github/workflows/lighthouse.yml) and locally
// via `npm run lhci` after `npm run build`.
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      numberOfRuns: 3,
      settings: {
        chromeFlags: '--no-sandbox',
      },
      url: [
        'http://localhost/',
        'http://localhost/about/',
        'http://localhost/blog/',
        'http://localhost/podcast/',
        'http://localhost/projects/',
        'http://localhost/blog/how-to-start-working-with-ai/',
        'http://localhost/blog/3-big-scary-software-engineering-words-explained/',
        'http://localhost/podcast/v0-0-10-joram-mutenge/',
        'http://localhost/podcast/v0-0-0-the-first-commit/',
        'http://localhost/projects/audition-cat/',
      ],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

- [ ] **Step 4: Build the site**

Run:
```bash
npm run build
```
Expected: `dist/` is created. If the build errors on a missing `GITHUB_TOKEN`, run `GITHUB_TOKEN=$(gh auth token) npm run build`.

- [ ] **Step 5: Confirm the audited paths exist in `dist/`**

Run:
```bash
for p in index about/index blog/index podcast/index projects/index \
  blog/how-to-start-working-with-ai/index \
  blog/3-big-scary-software-engineering-words-explained/index \
  podcast/v0-0-10-joram-mutenge/index podcast/v0-0-0-the-first-commit/index \
  projects/audition-cat/index; do
  test -f "dist/$p.html" && echo "OK  $p.html" || echo "MISSING  $p.html";
done
```
Expected: all 10 print `OK`. If any print `MISSING`, the slug/route changed. Fix the corresponding `url` entry in `lighthouserc.cjs` to a path that exists (use the explicit `/index.html` form if a directory URL 404s during Step 6), and re-run this check.

- [ ] **Step 6: Run Lighthouse and verify it passes**

Run:
```bash
npm run lhci
```
Expected: LHCI runs 3 audits per URL, prints an assertion summary with no failures, and prints a `temporary-public-storage` report URL per page. Note any category that lands close to its threshold (esp. performance near 0.90) for the baseline record.

If performance fails on an image-heavy page by a small margin (0.87 to 0.89), STOP and report the numbers to Mindi before changing thresholds (per the spec's baseline caveat). Do not silently relax the gate.

- [ ] **Step 7: Sanity-check that the gate actually fails**

Temporarily tighten one assertion to prove the check bites. Edit `lighthouserc.cjs`, change the performance line to:
```js
        'categories:performance': ['error', { minScore: 1 }],
```
Run:
```bash
npm run lhci
```
Expected: FAIL, with an assertion error naming `categories:performance`. Then revert that line back to `{ minScore: 0.9 }`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json lighthouserc.cjs
git commit -m "chore: add Lighthouse CI config and lhci script"
```

---

### Task 2: Pull-request Lighthouse workflow

**Files:**
- Create: `.github/workflows/lighthouse.yml`

**Interfaces:**
- Consumes: `npm run build` and `npm run lhci` from Task 1.
- Produces: a `lighthouse` GitHub Actions check on every pull request.

- [ ] **Step 1: Create the workflow**

Create `.github/workflows/lighthouse.yml` with exactly:
```yaml
# Lighthouse budgets: audits a representative set of pages on every PR and
# hard-fails if performance, accessibility, best-practices, or SEO regress
# below threshold (see lighthouserc.cjs). Runs on pull_request ONLY so it never
# gates the direct-to-main auto-deploy; intended as a required status check.
name: Lighthouse

on:
  pull_request:
  workflow_dispatch:

# One run per ref; newer pushes cancel in-flight checks.
concurrency:
  group: lighthouse-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: npm

      - run: npm ci

      - name: Build site
        run: npm run build
        env:
          GITHUB_TOKEN: ${{ github.token }}

      - name: Lighthouse CI
        run: npm run lhci
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

Note: `LHCI_GITHUB_APP_TOKEN` is optional (enables richer GitHub status posting). The check works without the secret set (uploads still go to temporary-public-storage); leave the env line in so it activates automatically if the secret is ever added.

- [ ] **Step 2: Lint the workflow YAML**

Run:
```bash
npx --yes actionlint .github/workflows/lighthouse.yml || echo "actionlint not run (optional) - eyeball indentation instead"
```
Expected: no errors. If `actionlint` is unavailable, visually confirm 2-space indentation and that the file parses as YAML.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/lighthouse.yml
git commit -m "ci: run Lighthouse budgets on pull requests"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin chore/lighthouse-ci-budgets
gh pr create --fill --base main
```
Expected: PR opens. Confirm the `Lighthouse / lighthouse` check appears in the PR checks and finishes green (report links show in the job log). This is the real end-to-end verification.

- [ ] **Step 5: Owner follow-up (manual, note in PR)**

After merge, the repo owner enables `lighthouse` as a required status check in branch-protection settings (same as `lint`/`build`). Add this as a line in the PR description so it is not forgotten.

---

## Notes for the executor

- Do not merge the PR automatically. Mindi reviews and merges (squash preferred).
- If Step 6 of Task 1 surfaces a genuine perf shortfall, surface the numbers rather than loosening thresholds.
- The `chore/lighthouse-ci-budgets` branch and the spec commit (`d4e1826`) already exist; keep working on that branch.
