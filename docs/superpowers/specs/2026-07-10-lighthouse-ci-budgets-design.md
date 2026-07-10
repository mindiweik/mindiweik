# Lighthouse CI budgets

**Date:** 2026-07-10
**Status:** Approved, ready for implementation plan
**Requested:** 2026-07-03 (`docs/followups.md` "Lighthouse CI budgets")

## Problem

The site has no automated guard on Lighthouse scores. A change can silently
regress performance, accessibility, best-practices, or SEO and only be noticed
later (or never). We just finished a thorough accessibility pass (0 axe
violations) and an SEO/AEO build, so there is real quality to protect from drift.

The related followup notes running Lighthouse/axe "in CI" as the open piece; this
spec covers Lighthouse. (axe already runs as a local pass, not in CI, and is out
of scope here.)

## Goal

Run Lighthouse in CI on every pull request and fail the check if any audited
page drops below score thresholds for performance, accessibility,
best-practices, or SEO. Catch regressions before they merge.

## Non-goals (YAGNI)

- Resource-size budgets (`budgets.json` for JS/image bytes). Possible later add.
- LHCI server / historical trend dashboards.
- Running on pushes to `main` (see enforcement decision below).
- Bringing axe into CI (tracked separately).

## Enforcement decision

`main` auto-deploys to prod on every push (FTP via `deploy.yml`). To avoid a
noisy Lighthouse run ever blocking a deploy, the check runs on **`pull_request`
only** and becomes a **required status check** via branch protection.

- Regressions cannot merge (the gate does its job on the PR).
- The direct-to-main auto-deploy path is never gated by Lighthouse.
- This mirrors the existing model: `lint`/`build` are required checks; the
  advisory `links.yml` was deliberately kept non-blocking after false positives.

Enabling the required-check toggle in branch protection is a one-time manual
step for the repo owner (same as was done for `lint` + `build`).

## Thresholds (all hard-fail / error-level)

| Category | minScore |
|---|---|
| Performance | 0.90 |
| Accessibility | 0.95 |
| Best Practices | 0.95 |
| SEO | 0.95 |

"Budgets" here means category-score assertions (the practical form for a
content site), not byte budgets.

**Baseline caveat:** the first PR run reveals whether perf >= 0.90 holds across
all pages. If an image-heavy page lands at 0.87-0.89, the resolution (tune the
page vs. relax perf to a warning for that page) is decided from real numbers,
not guessed up front.

## Approach

`@lhci/cli` run directly (chosen over the `treosh/lighthouse-ci-action`
wrapper). Rationale: matches how this repo treats tooling (npm devDep + npm
script + in-repo config), reproducible locally via `npm run lhci`, and keeps the
third-party-action surface small.

### Components

1. **devDependency:** `@lhci/cli`.
2. **npm script:** `"lhci": "lhci autorun"`.
3. **Config `lighthouserc.cjs`:**
   - `collect.staticDistDir: './dist'` (LHCI serves the built site over
     localhost, removing network variance).
   - `collect.numberOfRuns: 3` (median of 3 audits per URL to damp
     Lighthouse's run-to-run noise).
   - `collect.settings.chromeFlags: '--no-sandbox'` (required in CI).
   - `collect.url`: the 10 representative URLs (below).
   - `assert.assertions`: the four category minScores above, all `error`.
   - `upload.target: 'temporary-public-storage'` so each run posts viewable
     report links in the CI log.
4. **Workflow `.github/workflows/lighthouse.yml`:** `on: pull_request` (+
   `workflow_dispatch` for manual runs). Steps: checkout → setup-node 22 (npm
   cache) → `npm ci` → `npm run build` → `npm run lhci`.

### Audited URLs (10 — one of every layout + content variance)

1. `/` (home)
2. `/about`
3. `/blog` (index)
4. `/podcast` (index)
5. `/projects` (index)
6. `/blog/ai-rubber-duck-debugging`
7. `/blog/3-big-scary-software-engineering-words-explained`
8. `/podcast/v0-0-10-joram-mutenge`
9. `/podcast/v0-0-0-the-first-commit`
10. `/projects/audition-cat`

Layouts share templates, so this sample catches template-level regressions
across home, about, all three index pages, blog posts, podcast episodes, and
project pages.

## Testing / verification

- `npm run lhci` runs green locally against a fresh `npm run build`.
- Confirm all 10 URLs are actually audited (not silently skipped) and the run
  fails loudly when a threshold is breached (sanity-check by temporarily
  tightening one assertion).
- Open a real PR and confirm the `lighthouse` check appears and reports report
  links; record the baseline scores.

## Rollout

1. Merge the workflow + config on this branch via PR.
2. Owner enables `lighthouse` as a required status check in branch protection.
3. Tune thresholds/URLs from the first real baseline if needed.
