import { describe, it, expect } from 'vitest';
import { publishState, showUnpublished } from './publish';

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

  it('date-only pubDates stay scheduled until the cron rebuild hour', () => {
    // 2026-07-02 date-only parses as midnight UTC (6pm Denver on July 1).
    // It must NOT publish before 13:00 UTC on the 2nd, even though midnight passed.
    expect(
      publishState({ pubDate: new Date('2026-07-02') }, new Date('2026-07-02T12:59:00Z')),
    ).toBe('scheduled');
    expect(
      publishState({ pubDate: new Date('2026-07-02') }, new Date('2026-07-02T13:00:01Z')),
    ).toBe('published');
  });

  it('explicit datetimes are respected as-is', () => {
    expect(publishState({ pubDate: new Date('2026-07-02T08:00:00Z') }, NOW)).toBe('published');
    expect(publishState({ pubDate: new Date('2026-07-02T18:00:00Z') }, NOW)).toBe('scheduled');
  });
});

describe('showUnpublished', () => {
  it('is true in the dev server', () => {
    expect(showUnpublished({ DEV: true })).toBe(true);
  });

  it('is true for a preview build (PUBLIC_SHOW_DRAFTS=true)', () => {
    expect(showUnpublished({ DEV: false, PUBLIC_SHOW_DRAFTS: 'true' })).toBe(true);
  });

  it('is false for a plain prod build', () => {
    expect(showUnpublished({ DEV: false })).toBe(false);
  });

  it('requires the exact string "true"', () => {
    expect(showUnpublished({ DEV: false, PUBLIC_SHOW_DRAFTS: '1' })).toBe(false);
  });
});
