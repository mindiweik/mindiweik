import { describe, it, expect } from 'vitest';
import { validateSubscribe, subscribeApiUrl, TOPICS } from './subscribe';

describe('TOPICS', () => {
  it('lists the three streams', () => {
    expect(TOPICS).toEqual(['blog', 'podcast', 'newsletter']);
  });
});

describe('validateSubscribe', () => {
  const base = { email: 'a@b.co', wantsBlog: true, wantsPodcast: true, wantsNewsletter: true };

  it('accepts a valid email with all topics on', () => {
    expect(validateSubscribe(base)).toEqual({ ok: true, errors: [] });
  });

  it('accepts a single topic', () => {
    expect(validateSubscribe({ ...base, wantsBlog: false, wantsPodcast: false })).toEqual({
      ok: true,
      errors: [],
    });
  });

  it('rejects a malformed email', () => {
    expect(validateSubscribe({ ...base, email: 'not-an-email' })).toEqual({
      ok: false,
      errors: ['email'],
    });
  });

  it('rejects an email over 190 chars', () => {
    const long = `${'a'.repeat(186)}@b.co`;
    expect(validateSubscribe({ ...base, email: long }).errors).toContain('email');
  });

  it('trims whitespace before validating', () => {
    expect(validateSubscribe({ ...base, email: '  a@b.co  ' }).ok).toBe(true);
  });

  it('rejects zero topics selected', () => {
    expect(
      validateSubscribe({ ...base, wantsBlog: false, wantsPodcast: false, wantsNewsletter: false }),
    ).toEqual({ ok: false, errors: ['topics'] });
  });

  it('reports both errors at once', () => {
    expect(
      validateSubscribe({
        email: 'nope',
        wantsBlog: false,
        wantsPodcast: false,
        wantsNewsletter: false,
      }).errors,
    ).toEqual(['email', 'topics']);
  });
});

describe('subscribeApiUrl', () => {
  it('defaults to the same-origin endpoint', () => {
    expect(subscribeApiUrl({})).toBe('/api/subscribe.php');
  });

  it('honors PUBLIC_SUBSCRIBE_API for local dev', () => {
    expect(
      subscribeApiUrl({ PUBLIC_SUBSCRIBE_API: 'http://localhost:8080/api/subscribe.php' }),
    ).toBe('http://localhost:8080/api/subscribe.php');
  });
});
