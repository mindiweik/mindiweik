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
