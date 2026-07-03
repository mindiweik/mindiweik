# Post-deploy smoke test design

**Date:** 2026-07-03
**Status:** Approved

## Problem

`deploy.yml` auto-deploys to production on every push to `main` (plus a daily cron and
manual dispatch). It uploads the built site to Hostinger over FTP in three passes: prod
(`mindiweik.com`), the `wip-podcast.com` landing page, and the `dev.mindiweik.com` preview.

Two real failure modes have already bitten this setup:

1. **FTP timeouts** — uploads have failed or partially completed. The upload action going
   red catches a full failure, but not a partial upload that reports success.
2. **CDN staleness** — `www.mindiweik.com` routes through `cdn.hstgr.net` and once served a
   stale edge copy while the apex was already correct.

Today nothing verifies the site is actually serving correct content after a deploy. A broken
build, a partial upload, or a stale edge can sit live for days before anyone notices.

## Goal

After a deploy finishes, automatically fetch the live site and confirm it is serving the
expected content. If it is not, turn the workflow run red so GitHub notifies Mindi within a
minute, instead of the breakage being discovered days later.

This is a **notification, not a rollback**. FTP deploys cannot be rolled back automatically;
the value is fast awareness.

## Scope

In scope: an HTTP smoke test of the live production sites after deploy.

Out of scope: rollback/auto-revert, checking `dev.mindiweik.com` (basic-auth'd; skipped by
choice), visual/screenshot diffing, per-page content assertions beyond the homepage marker.

## Checks

| URL | Expect | Rationale |
|-----|--------|-----------|
| `https://mindiweik.com/` | HTTP 200 + body contains `mindiweik` | apex home is up and serving real content, not a blank page or 500 |
| `https://mindiweik.com/blog/` | HTTP 200 | blog section built and routed |
| `https://mindiweik.com/podcast/` | HTTP 200 | podcast section built and routed |
| `https://www.mindiweik.com/` | HTTP 200 | catches the CDN-staleness failure mode on the www edge |
| `https://wip-podcast.com/` | HTTP 200 | migration landing page + 301 host is alive |

The `mindiweik` content marker on the apex homepage guards against the "server returns 200
for an empty or error page" case. The other checks are status-only to stay resilient to
routine content changes.

## Design

### Structure

A separate GitHub Actions job, `smoke-test`, with `needs: deploy`, added to `deploy.yml`. It
runs only after the `deploy` job (all three FTP uploads) completes successfully. Keeping it a
separate job means:

- its status is independently visible in the run,
- it cannot block or interfere with the uploads,
- a smoke-test failure clearly reads as "deployed but not serving correctly," distinct from
  an upload failure.

### Checker script

`scripts/smoke-test.mjs`, run by the job with `node scripts/smoke-test.mjs`.

- A hardcoded `CHECKS` array of `{ url, expectStatus, expectText? }` — the single place to
  edit the URL list.
- A fetch-with-retry loop per check to absorb FTP/CDN propagation lag: up to 5 attempts,
  ~10s apart (~50s max per URL) before a check is allowed to fail.
- Uses native `fetch` (Node 22, already the workflow's node version) — **zero new
  dependencies**.
- Prints a clear per-check pass/fail line. Exits non-zero if any check fails after its
  retries, which fails the job and the run.
- No secrets required — all URLs are public. (The dev preview is intentionally not checked,
  so no basic-auth credentials are needed in CI.)

### Failure behavior

Any check failing after retries → script exits 1 → `smoke-test` job fails → workflow run goes
red → GitHub emails Mindi and marks the commit with a ✗. No automatic remediation.

## Testing

The retry/assertion logic in `smoke-test.mjs` is unit-testable by injecting a fake fetch:
verify it passes on 200 + matching text, retries then fails on persistent non-200, and fails
on a 200 whose body is missing the expected marker. A live end-to-end check is a manual
`workflow_dispatch` run after merge.

## Rollout

1. Add `scripts/smoke-test.mjs` + tests.
2. Add the `smoke-test` job to `deploy.yml`.
3. Merge to `main`; the first real deploy exercises it. Optionally trigger a manual
   `workflow_dispatch` to confirm green before relying on it.
