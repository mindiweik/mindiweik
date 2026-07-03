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
