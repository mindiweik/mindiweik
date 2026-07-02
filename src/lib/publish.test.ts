import { describe, it, expect } from 'vitest';
import { publishState } from './publish';

const NOW = new Date('2026-07-02T12:00:00Z');

describe('publishState', () => {
  it('returns draft when the draft flag is set', () => {
    expect(publishState({ draft: true, pubDate: new Date('2026-01-01') }, NOW)).toBe('draft');
  });

  it('draft wins even when the date is in the future', () => {
    expect(publishState({ draft: true, pubDate: new Date('2027-01-01') }, NOW)).toBe('draft');
  });

  it('returns scheduled for a future pubDate', () => {
    expect(publishState({ pubDate: new Date('2026-07-03') }, NOW)).toBe('scheduled');
  });

  it('returns published for a past pubDate', () => {
    expect(publishState({ pubDate: new Date('2026-07-01') }, NOW)).toBe('published');
  });

  it('reads the speaking-style date field', () => {
    expect(publishState({ date: new Date('2027-01-01') }, NOW)).toBe('scheduled');
    expect(publishState({ date: new Date('2026-01-01') }, NOW)).toBe('published');
  });

  it('returns published when there is no date at all', () => {
    expect(publishState({}, NOW)).toBe('published');
  });
});
