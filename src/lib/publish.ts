export type PublishState = 'draft' | 'scheduled' | 'published';

interface Publishable {
  draft?: boolean;
  pubDate?: Date; // blog + podcast
  date?: Date;    // speaking
}

// Date-only frontmatter dates (the common case) parse as midnight UTC, which
// is the evening before in Denver. Treat those as releasing at the daily cron
// rebuild hour so a push the night before never leaks the next day's post.
// Matches the cron in .github/workflows/deploy.yml.
const RELEASE_HOUR_UTC = 13;
const DAY_MS = 86_400_000;

function releaseTime(date: Date): number {
  const isDateOnly = date.getTime() % DAY_MS === 0;
  return isDateOnly ? date.getTime() + RELEASE_HOUR_UTC * 3_600_000 : date.getTime();
}

// Pure, testable. The env-aware wrapper is `isVisible` below.
export function publishState(data: Publishable, now: Date): PublishState {
  if (data.draft) return 'draft';
  const date = data.pubDate ?? data.date;
  if (date && releaseTime(date) > now.getTime()) return 'scheduled';
  return 'published';
}

// Dev renders everything; prod builds evaluate "now" at build time, so the
// daily cron rebuild is what releases scheduled entries.
export function isVisible(entry: { data: Publishable }): boolean {
  if (import.meta.env.DEV) return true;
  return publishState(entry.data, new Date()) === 'published';
}
