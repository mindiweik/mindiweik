import { describe, it, expect } from 'vitest';
import {
  isValidPageKey,
  isValidEmail,
  validateComment,
  commentsApiUrl,
  formatCommentDate,
  LIMITS,
} from './comments';

describe('isValidPageKey', () => {
  it('accepts blog and podcast keys', () => {
    expect(isValidPageKey('blog/my-post')).toBe(true);
    expect(isValidPageKey('podcast/v1.0.3')).toBe(true);
  });
  it('rejects other zones and junk', () => {
    expect(isValidPageKey('speaking/x')).toBe(false);
    expect(isValidPageKey('blog/')).toBe(false);
    expect(isValidPageKey('../etc/passwd')).toBe(false);
    expect(isValidPageKey('blog/a b')).toBe(false);
  });
});

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('reader@example.com')).toBe(true);
  });
  it('rejects malformed or overlong addresses', () => {
    expect(isValidEmail('nope')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail('x@y.com'.padStart(200, 'z'))).toBe(false);
  });
});

describe('validateComment', () => {
  it('passes a good comment', () => {
    expect(validateComment({ name: 'Mindi', email: 'm@x.com', body: 'hi' }))
      .toEqual({ ok: true, errors: [] });
  });
  it('flags each bad field', () => {
    const r = validateComment({ name: '', email: 'bad', body: '' });
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(expect.arrayContaining(['name', 'email', 'body']));
  });
  it('trims before measuring', () => {
    expect(validateComment({ name: '   ', email: 'm@x.com', body: '  ' }).ok).toBe(false);
  });
  it('enforces the body max length', () => {
    const long = 'a'.repeat(LIMITS.body + 1);
    expect(validateComment({ name: 'M', email: 'm@x.com', body: long }).errors).toContain('body');
  });
});

describe('commentsApiUrl', () => {
  it('defaults to the same-origin endpoint', () => {
    expect(commentsApiUrl({})).toBe('/api/comments.php');
  });
  it('honors a local override', () => {
    expect(commentsApiUrl({ PUBLIC_COMMENTS_API: 'http://localhost:8080/api/comments.php' }))
      .toBe('http://localhost:8080/api/comments.php');
  });
});

describe('formatCommentDate', () => {
  it('formats an ISO date', () => {
    expect(formatCommentDate('2026-07-03T15:00:00Z')).toBe('Jul 3, 2026');
  });
  it('returns empty string for junk', () => {
    expect(formatCommentDate('not-a-date')).toBe('');
  });
});
