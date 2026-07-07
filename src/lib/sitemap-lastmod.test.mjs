import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { extractLastmod, buildLastmodMap } from './sitemap-lastmod.mjs';

describe('extractLastmod', () => {
  it('prefers updatedDate over pubDate', () => {
    const src = `---\ntitle: 't'\npubDate: 2026-01-01\nupdatedDate: 2026-02-02\n---\nbody`;
    expect(extractLastmod(src)).toBe('2026-02-02');
  });

  it('falls back to pubDate, tolerating quotes', () => {
    expect(extractLastmod(`---\npubDate: '2026-03-04'\n---`)).toBe('2026-03-04');
  });

  it('falls back to date (speaking collection)', () => {
    expect(extractLastmod(`---\ndate: 2026-05-06\n---`)).toBe('2026-05-06');
  });

  it('returns null when no date field exists', () => {
    expect(extractLastmod(`---\ntitle: 'x'\n---`)).toBeNull();
  });

  it('ignores dates in the body', () => {
    expect(extractLastmod(`---\ntitle: 'x'\n---\npubDate: 2026-01-01`)).toBeNull();
  });
});

describe('buildLastmodMap', () => {
  it('maps collection routes to dates from fixture files', () => {
    const base = mkdtempSync(join(tmpdir(), 'lastmod-'));
    mkdirSync(join(base, 'blog'));
    mkdirSync(join(base, 'podcast'));
    writeFileSync(join(base, 'blog', 'my-post.md'), `---\npubDate: 2026-01-01\n---\n`);
    writeFileSync(join(base, 'podcast', 'ep-1.mdx'), `---\npubDate: 2026-02-02\n---\n`);
    writeFileSync(join(base, 'blog', 'notes.txt'), 'not content');
    const map = buildLastmodMap(base);
    expect(map.get('/blog/my-post')).toBe('2026-01-01');
    expect(map.get('/podcast/ep-1')).toBe('2026-02-02');
    expect(map.size).toBe(2);
  });

  it('skips collections whose directory is missing', () => {
    const base = mkdtempSync(join(tmpdir(), 'lastmod-'));
    expect(buildLastmodMap(base).size).toBe(0);
  });
});
