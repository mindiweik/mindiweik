# Post-deploy smoke test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a deploy, fetch the live production sites and fail the workflow run if any is not serving the expected content, so breakage is noticed within a minute instead of days.

**Architecture:** A dependency-free Node script (`scripts/smoke-test.mjs`) exports pure, injectable check logic (fetch + sleep passed in) so it is unit-testable without network or real waits, plus a `main()` runner that uses real `fetch`/`setTimeout` and exits non-zero on failure. A new `smoke-test` GitHub Actions job (`needs: deploy`) runs the script after the FTP uploads finish.

**Tech Stack:** Node 22 (native `fetch`), Vitest, GitHub Actions.

## Global Constraints

- Zero new npm dependencies — native `fetch` only (Node 22).
- ESM (`"type": "module"`); scripts live in `scripts/`, with colocated `scripts/*.test.mjs` (Vitest).
- Test command: `npx vitest run scripts/smoke-test.test.mjs`.
- The dev preview (`dev.mindiweik.com`) is intentionally NOT checked (basic-auth'd) — no credentials in CI.
- Checks: `mindiweik.com/` → 200 + body contains `mindiweik`; `mindiweik.com/blog/`, `mindiweik.com/podcast/`, `www.mindiweik.com/`, `wip-podcast.com/` → 200. Retry each up to 5 attempts, 10000 ms apart, before failing.

---

### Task 1: Smoke-test checker script + tests

**Files:**
- Create: `scripts/smoke-test.mjs`
- Test: `scripts/smoke-test.test.mjs`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces:
  - `CHECKS` — array of `{ url: string, expectStatus: number, expectText?: string }`.
  - `checkOne(check, opts) => Promise<{ url, ok: boolean, detail: string }>` where `opts = { fetchFn, attempts = 5, delayMs = 10000, sleep }`. `sleep(ms) => Promise<void>`.
  - `runChecks(checks, opts) => Promise<{ passed: boolean, results: Array<{ url, ok, detail }> }>`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/smoke-test.test.mjs`:

```javascript
import { describe, it, expect } from 'vitest';
import { CHECKS, checkOne, runChecks } from './smoke-test.mjs';

// A fake fetch that returns queued responses in order, recording call count.
function fakeFetch(responses) {
  let i = 0;
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const r = responses[Math.min(i, responses.length - 1)];
    i += 1;
    if (r instanceof Error) throw r;
    return { status: r.status, text: async () => r.body ?? '' };
  };
  fn.calls = calls;
  return fn;
}

const noSleep = async () => {};

describe('CHECKS', () => {
  it('covers the five production URLs, apex home asserts content', () => {
    const urls = CHECKS.map((c) => c.url);
    expect(urls).toEqual([
      'https://mindiweik.com/',
      'https://mindiweik.com/blog/',
      'https://mindiweik.com/podcast/',
      'https://www.mindiweik.com/',
      'https://wip-podcast.com/',
    ]);
    const home = CHECKS.find((c) => c.url === 'https://mindiweik.com/');
    expect(home.expectStatus).toBe(200);
    expect(home.expectText).toBe('mindiweik');
    // dev preview must never be checked (basic-auth'd)
    expect(urls.some((u) => u.includes('dev.mindiweik.com'))).toBe(false);
  });
});

describe('checkOne', () => {
  it('passes on 200 with matching text on the first try', async () => {
    const fetchFn = fakeFetch([{ status: 200, body: '<h1>mindiweik</h1>' }]);
    const r = await checkOne(
      { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
      { fetchFn, sleep: noSleep }
    );
    expect(r.ok).toBe(true);
    expect(fetchFn.calls.length).toBe(1);
  });

  it('passes on a status-only check without inspecting body', async () => {
    const fetchFn = fakeFetch([{ status: 200, body: '' }]);
    const r = await checkOne(
      { url: 'https://mindiweik.com/blog/', expectStatus: 200 },
      { fetchFn, sleep: noSleep }
    );
    expect(r.ok).toBe(true);
  });

  it('retries then fails after all attempts on persistent non-200', async () => {
    const fetchFn = fakeFetch([{ status: 503, body: '' }]);
    const r = await checkOne(
      { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
      { fetchFn, attempts: 3, sleep: noSleep }
    );
    expect(r.ok).toBe(false);
    expect(fetchFn.calls.length).toBe(3);
    expect(r.detail).toContain('503');
  });

  it('recovers when a later attempt succeeds (propagation lag)', async () => {
    const fetchFn = fakeFetch([
      { status: 404, body: '' },
      { status: 200, body: 'mindiweik' },
    ]);
    const r = await checkOne(
      { url: 'https://www.mindiweik.com/', expectStatus: 200 },
      { fetchFn, attempts: 5, sleep: noSleep }
    );
    expect(r.ok).toBe(true);
    expect(fetchFn.calls.length).toBe(2);
  });

  it('fails a 200 whose body is missing the expected marker', async () => {
    const fetchFn = fakeFetch([{ status: 200, body: '<html>error</html>' }]);
    const r = await checkOne(
      { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
      { fetchFn, attempts: 2, sleep: noSleep }
    );
    expect(r.ok).toBe(false);
    expect(r.detail).toContain('mindiweik');
  });

  it('treats a thrown fetch (network error) as a retryable failure', async () => {
    const fetchFn = fakeFetch([new Error('ECONNRESET')]);
    const r = await checkOne(
      { url: 'https://wip-podcast.com/', expectStatus: 200 },
      { fetchFn, attempts: 2, sleep: noSleep }
    );
    expect(r.ok).toBe(false);
    expect(fetchFn.calls.length).toBe(2);
  });
});

describe('runChecks', () => {
  it('passes only when every check passes', async () => {
    const fetchFn = fakeFetch([{ status: 200, body: 'mindiweik' }]);
    const { passed, results } = await runChecks(
      [
        { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
        { url: 'https://mindiweik.com/blog/', expectStatus: 200 },
      ],
      { fetchFn, sleep: noSleep }
    );
    expect(passed).toBe(true);
    expect(results.length).toBe(2);
  });

  it('fails overall if any single check fails', async () => {
    let call = 0;
    const fetchFn = async (url) => {
      call += 1;
      // first URL ok, second URL always 500
      const ok = url.endsWith('.com/');
      return { status: ok ? 200 : 500, text: async () => 'mindiweik' };
    };
    const { passed } = await runChecks(
      [
        { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
        { url: 'https://mindiweik.com/blog/', expectStatus: 200 },
      ],
      { fetchFn, attempts: 1, sleep: noSleep }
    );
    expect(passed).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test && npx vitest run scripts/smoke-test.test.mjs`
Expected: FAIL — cannot resolve `./smoke-test.mjs` (module does not exist yet).

- [ ] **Step 3: Write the implementation**

Create `scripts/smoke-test.mjs`:

```javascript
// Post-deploy smoke test: fetch the live production sites and confirm they
// serve the expected status/content. Run by the `smoke-test` job in deploy.yml.
// Zero dependencies (native fetch, Node 22). See
// docs/superpowers/specs/2026-07-03-post-deploy-smoke-test-design.md
import { fileURLToPath } from 'node:url';

export const CHECKS = [
  { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
  { url: 'https://mindiweik.com/blog/', expectStatus: 200 },
  { url: 'https://mindiweik.com/podcast/', expectStatus: 200 },
  { url: 'https://www.mindiweik.com/', expectStatus: 200 },
  { url: 'https://wip-podcast.com/', expectStatus: 200 },
];

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Try one URL up to `attempts` times, waiting `delayMs` between tries, to
// absorb FTP/CDN propagation lag. Resolves as soon as one attempt passes.
export async function checkOne(check, opts = {}) {
  const { fetchFn = fetch, attempts = 5, delayMs = 10000, sleep = realSleep } = opts;
  const { url, expectStatus, expectText } = check;
  let detail = 'no attempts made';

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetchFn(url);
      if (res.status !== expectStatus) {
        detail = `expected ${expectStatus}, got ${res.status}`;
      } else if (expectText) {
        const body = await res.text();
        if (!body.includes(expectText)) {
          detail = `status ${res.status} ok but body missing "${expectText}"`;
        } else {
          return { url, ok: true, detail: `${res.status} + "${expectText}"` };
        }
      } else {
        return { url, ok: true, detail: `${res.status}` };
      }
    } catch (err) {
      detail = `request error: ${err.message}`;
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  return { url, ok: false, detail: `${detail} (after ${attempts} attempts)` };
}

export async function runChecks(checks, opts = {}) {
  const results = [];
  for (const check of checks) {
    results.push(await checkOne(check, opts));
  }
  return { passed: results.every((r) => r.ok), results };
}

async function main() {
  console.log('Post-deploy smoke test\n');
  const { passed, results } = await runChecks(CHECKS);
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.url}  ${r.detail}`);
  }
  console.log('');
  if (!passed) {
    console.error('Smoke test FAILED: the deploy is not serving correctly.');
    process.exit(1);
  }
  console.log('Smoke test passed: all sites serving correctly.');
}

// Run main() only when invoked directly (`node scripts/smoke-test.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test && npx vitest run scripts/smoke-test.test.mjs`
Expected: PASS — all describe blocks green.

- [ ] **Step 5: Run the full suite to confirm nothing else broke**

Run: `cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test && npm test`
Expected: PASS — existing lib/script tests still green, plus the new smoke-test file.

- [ ] **Step 6: Commit**

```bash
cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test
git add scripts/smoke-test.mjs scripts/smoke-test.test.mjs
git commit -m "feat: post-deploy smoke test checker script"
```

---

### Task 2: Wire the smoke-test job into deploy.yml

**Files:**
- Modify: `.github/workflows/deploy.yml` (add a new job after the existing `deploy` job)

**Interfaces:**
- Consumes: `scripts/smoke-test.mjs` (Task 1) via `node scripts/smoke-test.mjs`.
- Produces: a `smoke-test` job that fails the run when the script exits non-zero.

- [ ] **Step 1: Add the `smoke-test` job**

Append to `.github/workflows/deploy.yml`, as a new job under `jobs:` (sibling of `deploy`, after it):

```yaml
  # Post-deploy verification: fetch the live sites and fail the run if any is
  # not serving the expected content. Notification only (FTP has no rollback);
  # value is fast awareness. See scripts/smoke-test.mjs.
  smoke-test:
    needs: deploy
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - name: Smoke-test the live sites
        run: node scripts/smoke-test.mjs
```

- [ ] **Step 2: Validate the workflow YAML parses**

Run: `cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test && node -e "import('js-yaml').then(y=>{const fs=require('fs');y.load(fs.readFileSync('.github/workflows/deploy.yml','utf8'));console.log('yaml ok')}).catch(()=>{const fs=require('fs');const t=fs.readFileSync('.github/workflows/deploy.yml','utf8');if(t.includes('smoke-test:')&&t.includes('needs: deploy'))console.log('yaml ok (structural check)');else{console.error('missing job');process.exit(1)}})"`
Expected: prints `yaml ok` (or `yaml ok (structural check)` if js-yaml is absent — it is not a project dep).

- [ ] **Step 3: Dry-run the script locally against live prod**

Run: `cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test && node scripts/smoke-test.mjs`
Expected: PASS lines for all five URLs and "Smoke test passed" (prod is currently live). This confirms the real URLs and content marker are correct. If a check fails, fix the URL/marker in `CHECKS` before committing.

- [ ] **Step 4: Commit**

```bash
cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/smoke-test
git add .github/workflows/deploy.yml
git commit -m "ci: run post-deploy smoke test after FTP uploads"
```

---

## Notes for the implementer

- The `smoke-test` job runs for every `deploy` trigger (push to main, daily cron, manual dispatch) because it `needs: deploy`. It will not run on this feature branch until merged to `main` or triggered via `workflow_dispatch`.
- After merge, optionally trigger a manual `workflow_dispatch` run to confirm the job goes green end-to-end in CI (Step 3 already proved the script itself works against live prod).
- Do NOT add the dev preview URL to `CHECKS` — it is basic-auth'd and checking it would need credentials in CI (out of scope by design).
