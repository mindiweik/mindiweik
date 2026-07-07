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
