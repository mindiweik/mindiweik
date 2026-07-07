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

import { toNotifyFeedItems } from './subscribe';

describe('toNotifyFeedItems', () => {
  const site = 'https://mindiweik.com';
  const blogEntry = (id: string, iso: string) => ({
    id,
    data: { title: `post ${id}`, description: `about ${id}`, pubDate: new Date(iso) },
  });
  // Real episodes carry `descriptor` (not `description`) and a `version`.
  const podEntry = (id: string, iso: string) => ({
    id,
    data: { title: `ep ${id}`, descriptor: `show ${id}`, pubDate: new Date(iso), version: id },
  });

  it('shapes blog and podcast entries with absolute links', () => {
    const items = toNotifyFeedItems(
      { blog: [blogEntry('my-post', '2026-07-01')], podcast: [podEntry('v1.0.4', '2026-06-01')] },
      site,
    );
    expect(items).toEqual([
      {
        key: 'blog/my-post',
        type: 'blog',
        title: 'post my-post',
        description: 'about my-post',
        link: 'https://mindiweik.com/blog/my-post/',
        pubDate: new Date('2026-07-01').toISOString(),
      },
      {
        key: 'podcast/v1.0.4',
        type: 'podcast',
        title: 'v1.0.4 ep v1.0.4',
        description: 'show v1.0.4',
        link: 'https://mindiweik.com/podcast/v1.0.4/',
        pubDate: new Date('2026-06-01').toISOString(),
      },
    ]);
  });

  it('prefixes podcast titles with the version and reads descriptor', () => {
    const items = toNotifyFeedItems(
      {
        blog: [],
        podcast: [
          {
            id: 'guest-slug',
            data: {
              title: 'a great guest',
              descriptor: 'we talked shop',
              version: 'v2.0.0',
              pubDate: new Date('2026-07-01'),
            },
          },
        ],
      },
      site,
    );
    expect(items[0].title).toBe('v2.0.0 a great guest');
    expect(items[0].description).toBe('we talked shop');
  });

  it('leaves podcast description empty when it has no descriptor yet', () => {
    const items = toNotifyFeedItems(
      {
        blog: [],
        podcast: [
          {
            id: 'bare-ep',
            data: { title: 'no summary', version: 'v0.0.1', pubDate: new Date('2026-07-01') },
          },
        ],
      },
      site,
    );
    expect(items[0].title).toBe('v0.0.1 no summary');
    expect(items[0].description).toBe('');
  });

  it('sorts newest first across both collections', () => {
    const items = toNotifyFeedItems(
      {
        blog: [blogEntry('old', '2026-01-01'), blogEntry('new', '2026-07-01')],
        podcast: [podEntry('mid', '2026-04-01')],
      },
      site,
    );
    expect(items.map((i) => i.key)).toEqual(['blog/new', 'podcast/mid', 'blog/old']);
  });

  it('caps at the limit (default 20)', () => {
    const blog = Array.from({ length: 25 }, (_, i) =>
      blogEntry(`p${i}`, `2026-01-${String(i + 1).padStart(2, '0')}`),
    );
    expect(toNotifyFeedItems({ blog, podcast: [] }, site)).toHaveLength(20);
    expect(toNotifyFeedItems({ blog, podcast: [] }, site, 5)).toHaveLength(5);
  });

  it('defaults a missing description to empty string', () => {
    const entry = { id: 'bare', data: { title: 'bare', pubDate: new Date('2026-07-01') } };
    expect(toNotifyFeedItems({ blog: [entry], podcast: [] }, site)[0].description).toBe('');
  });

  it('strips a trailing slash from the site url', () => {
    const items = toNotifyFeedItems(
      { blog: [blogEntry('x', '2026-07-01')], podcast: [] },
      `${site}/`,
    );
    expect(items[0].link).toBe('https://mindiweik.com/blog/x/');
  });
});
