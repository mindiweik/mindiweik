export type PublishState = 'draft' | 'scheduled' | 'published';

interface Publishable {
  draft?: boolean;
  pubDate?: Date; // blog + podcast
  date?: Date;    // speaking
}

// Pure, testable. The env-aware wrapper is `isVisible` below.
export function publishState(data: Publishable, now: Date): PublishState {
  if (data.draft) return 'draft';
  const date = data.pubDate ?? data.date;
  if (date && date.getTime() > now.getTime()) return 'scheduled';
  return 'published';
}

// Dev renders everything; prod builds evaluate "now" at build time, so the
// daily cron rebuild is what releases scheduled entries.
export function isVisible(entry: { data: Publishable }): boolean {
  if (import.meta.env.DEV) return true;
  return publishState(entry.data, new Date()) === 'published';
}
