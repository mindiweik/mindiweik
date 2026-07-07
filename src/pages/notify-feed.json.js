/* global Response */
import { getCollection } from 'astro:content';
import { SITE } from '../config/site.ts';
import { isVisible } from '../lib/publish.ts';
import { toNotifyFeedItems } from '../lib/subscribe.ts';

export async function GET() {
  const [blog, podcast] = await Promise.all([
    getCollection('blog', isVisible),
    getCollection('podcast', isVisible),
  ]);
  return new Response(JSON.stringify(toNotifyFeedItems({ blog, podcast }, SITE.url)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
