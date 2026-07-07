import { describe, it, expect } from 'vitest';
import { canonicalUrl } from './urls';

describe('canonicalUrl', () => {
  it('builds an absolute URL with a trailing slash', () => {
    expect(canonicalUrl('/blog/my-post', 'https://mindiweik.com')).toBe(
      'https://mindiweik.com/blog/my-post/',
    );
  });

  it('keeps an existing trailing slash', () => {
    expect(canonicalUrl('/blog/my-post/', 'https://mindiweik.com')).toBe(
      'https://mindiweik.com/blog/my-post/',
    );
  });

  it('handles the root path', () => {
    expect(canonicalUrl('/', 'https://mindiweik.com')).toBe('https://mindiweik.com/');
  });

  it('leaves file-like paths alone', () => {
    expect(canonicalUrl('/rss.xml', 'https://mindiweik.com')).toBe('https://mindiweik.com/rss.xml');
  });

  it('respects an alternate site origin (dev preview)', () => {
    expect(canonicalUrl('/about', new URL('https://dev.mindiweik.com'))).toBe(
      'https://dev.mindiweik.com/about/',
    );
  });
});
