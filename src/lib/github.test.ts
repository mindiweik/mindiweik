import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseGithubRepo, fetchRepoActivity, _clearActivityCache } from './github';

describe('parseGithubRepo', () => {
  it('parses a github https URL', () => {
    expect(parseGithubRepo('https://github.com/mindiweik/drip-dash')).toEqual({ owner: 'mindiweik', name: 'drip-dash' });
  });
  it('tolerates trailing slash and .git suffix', () => {
    expect(parseGithubRepo('https://github.com/mindiweik/drip-dash/')).toEqual({ owner: 'mindiweik', name: 'drip-dash' });
    expect(parseGithubRepo('https://github.com/mindiweik/drip-dash.git')).toEqual({ owner: 'mindiweik', name: 'drip-dash' });
  });
  it('returns null for non-github hosts (gitlab stays private)', () => {
    expect(parseGithubRepo('https://gitlab.com/auditioncat/app')).toBeNull();
  });
  it('returns null for garbage', () => {
    expect(parseGithubRepo('not a url')).toBeNull();
    expect(parseGithubRepo('https://github.com/onlyowner')).toBeNull();
  });
});

describe('fetchRepoActivity', () => {
  beforeEach(() => { _clearActivityCache(); vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('returns pushedAt from the GitHub API', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ pushed_at: '2026-01-05T12:00:00Z' }) });
    const out = await fetchRepoActivity('https://github.com/mindiweik/drip-dash');
    expect(out?.pushedAt.toISOString()).toBe('2026-01-05T12:00:00.000Z');
    expect(fetch).toHaveBeenCalledWith('https://api.github.com/repos/mindiweik/drip-dash', expect.anything());
  });
  it('returns null for non-github URLs without fetching', async () => {
    expect(await fetchRepoActivity('https://gitlab.com/auditioncat/app')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns null on HTTP error without throwing', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 403 });
    expect(await fetchRepoActivity('https://github.com/mindiweik/drip-dash')).toBeNull();
  });
  it('returns null on network error without throwing', async () => {
    (fetch as any).mockRejectedValue(new Error('boom'));
    expect(await fetchRepoActivity('https://github.com/mindiweik/drip-dash')).toBeNull();
  });
  it('caches per URL (one fetch for two calls)', async () => {
    (fetch as any).mockResolvedValue({ ok: true, json: async () => ({ pushed_at: '2026-01-05T12:00:00Z' }) });
    await fetchRepoActivity('https://github.com/mindiweik/drip-dash');
    await fetchRepoActivity('https://github.com/mindiweik/drip-dash');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
