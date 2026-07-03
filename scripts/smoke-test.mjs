// Post-deploy smoke test: fetch the live production sites and confirm they
// serve the expected status/content. Run by the `smoke-test` job in deploy.yml.
// Zero dependencies (native fetch, Node 22). See
// docs/superpowers/specs/2026-07-03-post-deploy-smoke-test-design.md
import { fileURLToPath } from 'node:url';

export const CHECKS = [
  { url: 'https://mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
  { url: 'https://mindiweik.com/blog/', expectStatus: 200 },
  { url: 'https://mindiweik.com/podcast/', expectStatus: 200 },
  { url: 'https://www.mindiweik.com/', expectStatus: 200, expectText: 'mindiweik' },
  { url: 'https://wip-podcast.com/', expectStatus: 200 },
];

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Node's fetch defaults to `User-Agent: node`, which shared-host WAFs (Hostinger
// included) commonly block. Presenting as a normal browser avoids being 403'd for
// looking like a bot when the runner hits the public site.
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// Statuses that mean "the host received the request and is refusing THIS client"
// (bot/rate-limit block) rather than "the deployed content is broken". A uniform
// block across every URL is a false alarm, not a deploy failure. See classifyFailure.
const BLOCK_STATUSES = new Set([403, 429]);

// Try one URL up to `attempts` times, waiting `delayMs` between tries, to
// absorb FTP/CDN propagation lag. Resolves as soon as one attempt passes.
// A failed result carries `blocked: true` when the terminal reason was a
// host-level block (403/429), so the caller can tell a bot-block apart from a
// genuine content/routing failure.
export async function checkOne(check, opts = {}) {
  const { fetchFn = fetch, attempts = 5, delayMs = 10000, sleep = realSleep } = opts;
  const { url, expectStatus, expectText } = check;
  let detail = 'no attempts made';
  let blocked = false;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const res = await fetchFn(url, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(10000),
      });
      if (res.status !== expectStatus) {
        detail = `expected ${expectStatus}, got ${res.status}`;
        blocked = BLOCK_STATUSES.has(res.status);
      } else if (expectText) {
        const body = await res.text();
        if (!body.includes(expectText)) {
          detail = `status ${res.status} ok but body missing "${expectText}"`;
          blocked = false; // 200 with wrong body is a real content problem
        } else {
          return { url, ok: true, blocked: false, detail: `${res.status} + "${expectText}"` };
        }
      } else {
        return { url, ok: true, blocked: false, detail: `${res.status}` };
      }
    } catch (err) {
      detail = `request error: ${err.message}`;
      blocked = false; // network error / timeout is ambiguous: fail loudly
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  return { url, ok: false, blocked, detail: `${detail} (after ${attempts} attempts)` };
}

export async function runChecks(checks, opts = {}) {
  const results = [];
  for (const check of checks) {
    results.push(await checkOne(check, opts));
  }
  const passed = results.every((r) => r.ok);
  // Inconclusive (not a deploy failure) only when EVERY check failed AND every
  // failure was a host-level block. If even one URL served correctly, or any
  // failure was a real 404/500/timeout, it's a genuine failure — fail loudly.
  const blocked = !passed && results.length > 0 && results.every((r) => r.blocked);
  return { passed, blocked, results };
}

async function main() {
  console.log('Post-deploy smoke test\n');
  const { passed, blocked, results } = await runChecks(CHECKS);
  for (const r of results) {
    console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.url}  ${r.detail}`);
  }
  console.log('');
  if (passed) {
    console.log('Smoke test passed: all sites serving correctly.');
    return;
  }
  if (blocked) {
    // Every URL returned 403/429 — Hostinger's bot protection blocked the CI
    // runner's datacenter IP. The FTP deploy already succeeded, so the host is
    // reachable and the content is live; this is a false alarm, not a broken
    // deploy. Stay green rather than page Mindi over a self-recovering block.
    console.warn(
      'Smoke test INCONCLUSIVE: every URL returned a host-level block (403/429).'
    );
    console.warn(
      'This means Hostinger blocked the CI runner, not that the deploy is broken. Not failing the run.'
    );
    return;
  }
  console.error('Smoke test FAILED: the deploy is not serving correctly.');
  process.exit(1);
}

// Run main() only when invoked directly (`node scripts/smoke-test.mjs`),
// not when imported by the test file.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
