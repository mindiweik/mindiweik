// Pure client-side subscription logic. Shared by SubscribeForm.astro and
// unit-tested here. subscribe.php re-validates everything server-side.

import { isValidEmail } from './comments';

export const TOPICS = ['blog', 'podcast', 'newsletter'] as const;
export type Topic = (typeof TOPICS)[number];

export interface SubscribeInput {
  email: string;
  wantsBlog: boolean;
  wantsPodcast: boolean;
  wantsNewsletter: boolean;
}

export function validateSubscribe(input: SubscribeInput): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!isValidEmail((input.email ?? '').trim())) errors.push('email');
  if (!input.wantsBlog && !input.wantsPodcast && !input.wantsNewsletter) errors.push('topics');
  return { ok: errors.length === 0, errors };
}

// Same-origin in prod; PUBLIC_SUBSCRIBE_API lets local dev point at a php -S server.
export function subscribeApiUrl(env: { PUBLIC_SUBSCRIBE_API?: string } = import.meta.env): string {
  return env.PUBLIC_SUBSCRIBE_API || '/api/subscribe.php';
}

// Feed shaping for /notify-feed.json. Pure so it can be tested on fixtures;
// the endpoint feeds it real collections filtered by isVisible.
export interface NotifyFeedItem {
  key: string;
  type: 'blog' | 'podcast';
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

interface CollectionEntry {
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
}

export function toNotifyFeedItems(
  raw: { blog: CollectionEntry[]; podcast: CollectionEntry[] },
  site: string,
  limit = 20,
): NotifyFeedItem[] {
  const base = site.replace(/\/+$/, '');
  const shape =
    (type: 'blog' | 'podcast') =>
    (e: CollectionEntry): NotifyFeedItem => ({
      key: `${type}/${e.id}`,
      type,
      title: e.data.title,
      description: e.data.description ?? '',
      link: `${base}/${type}/${e.id}/`,
      pubDate: e.data.pubDate.toISOString(),
    });
  return [...raw.blog.map(shape('blog')), ...raw.podcast.map(shape('podcast'))]
    .sort((a, b) => b.pubDate.localeCompare(a.pubDate))
    .slice(0, limit);
}
