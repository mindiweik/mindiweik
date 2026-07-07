import { describe, it, expect } from 'vitest';
import { extractLocs, buildPayload } from './indexnow-ping.mjs';

describe('extractLocs', () => {
  it('pulls every loc URL out of sitemap XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset><url><loc>https://mindiweik.com/</loc></url>
<url><loc>https://mindiweik.com/blog/my-post/</loc></url></urlset>`;
    expect(extractLocs(xml)).toEqual([
      'https://mindiweik.com/',
      'https://mindiweik.com/blog/my-post/',
    ]);
  });

  it('returns an empty array when no locs exist', () => {
    expect(extractLocs('<urlset></urlset>')).toEqual([]);
  });
});

describe('buildPayload', () => {
  it('shapes the IndexNow request with host, key, and key location', () => {
    const payload = buildPayload(['https://mindiweik.com/']);
    expect(payload.host).toBe('mindiweik.com');
    expect(payload.key).toMatch(/^[0-9a-f]{32}$/);
    expect(payload.keyLocation).toBe(`https://mindiweik.com/${payload.key}.txt`);
    expect(payload.urlList).toEqual(['https://mindiweik.com/']);
  });
});
