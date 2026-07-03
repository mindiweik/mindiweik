import { describe, it, expect } from 'vitest';
import { toChangelogEntries } from './collections';

describe('toChangelogEntries', () => {
  it('maps each collection to a typed, zone-tagged, sorted entry list', () => {
    const out = toChangelogEntries({
      blog: [{ id: 'a', data: { title: 'Essay A', pubDate: new Date('2026-01-01') } }],
      podcast: [
        { id: 'v1-0-4', data: { title: 'Ep', version: 'v1.0.4', pubDate: new Date('2026-03-01') } },
      ],
      speaking: [{ id: 's', data: { title: 'Talk', date: new Date('2026-02-01') } }],
      projects: [{ id: 'p', data: { name: 'Proj', since: 2023 } }],
    });
    expect(out[0].zone).toBe('podcast'); // newest first
    expect(out[0].type).toBe('v1.0.4');
    expect(out.find((e) => e.zone === 'blog')?.url).toBe('/blog/a');
    expect(out.find((e) => e.zone === 'projects')?.title).toBe('Proj');
  });
});

describe('toChangelogEntries speaking type', () => {
  it('uses the entry type for speaking (guest vs talk)', () => {
    const out = toChangelogEntries({
      blog: [],
      podcast: [],
      projects: [],
      speaking: [
        {
          id: 'a-guest',
          data: { title: 'on a show', type: 'guest', date: new Date('2025-01-01') },
        },
        { id: 'a-talk', data: { title: 'my talk', date: new Date('2025-02-01') } },
      ],
    });
    const guest = out.find((e) => e.title === 'on a show');
    const talk = out.find((e) => e.title === 'my talk');
    expect(guest?.type).toBe('guest');
    expect(talk?.type).toBe('talk');
  });
});

describe('toChangelogEntries project dates', () => {
  const base = { blog: [], podcast: [], speaking: [] };

  it('labels projects as update and links to the detail page', () => {
    const out = toChangelogEntries({
      ...base,
      projects: [{ id: 'drip-dash', data: { name: 'Drip Dash', since: 2025 } }],
    });
    expect(out[0].type).toBe('update');
    expect(out[0].url).toBe('/projects/drip-dash');
  });

  it('prefers manual lastUpdated over pushedAt', () => {
    const out = toChangelogEntries({
      ...base,
      projects: [
        {
          id: 'ac',
          data: { name: 'AC', since: 2023, lastUpdated: new Date('2026-05-01') },
          pushedAt: new Date('2026-06-01'),
        },
      ],
    });
    expect(out[0].date.toISOString()).toBe(new Date('2026-05-01').toISOString());
  });

  it('falls back to pushedAt, then Jan 1 of since', () => {
    const withPush = toChangelogEntries({
      ...base,
      projects: [{ id: 'a', data: { name: 'A', since: 2023 }, pushedAt: new Date('2026-06-01') }],
    });
    expect(withPush[0].date.toISOString()).toBe(new Date('2026-06-01').toISOString());
    const bare = toChangelogEntries({
      ...base,
      projects: [{ id: 'b', data: { name: 'B', since: 2023 } }],
    });
    expect(bare[0].date.getTime()).toBe(new Date(2023, 0, 1).getTime());
  });
});
