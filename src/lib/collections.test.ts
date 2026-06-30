import { describe, it, expect } from 'vitest';
import { toChangelogEntries } from './collections';

describe('toChangelogEntries', () => {
  it('maps each collection to a typed, zone-tagged, sorted entry list', () => {
    const out = toChangelogEntries({
      blog: [{ id: 'a', data: { title: 'Essay A', pubDate: new Date('2026-01-01') } }],
      podcast: [{ id: 'v1-0-4', data: { title: 'Ep', version: 'v1.0.4', pubDate: new Date('2026-03-01') } }],
      speaking: [{ id: 's', data: { title: 'Talk', date: new Date('2026-02-01') } }],
      projects: [{ id: 'p', data: { name: 'Proj' } }],
    });
    expect(out[0].zone).toBe('podcast'); // newest first
    expect(out[0].type).toBe('v1.0.4');
    expect(out.find((e) => e.zone === 'blog')?.url).toBe('/blog/a');
    expect(out.find((e) => e.zone === 'projects')?.title).toBe('Proj');
  });
});
