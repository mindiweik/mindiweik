import { getCollection } from 'astro:content';
import { isVisible } from '../lib/publish.ts';
import { llmsFull } from '../lib/llms.ts';

export async function GET() {
  const posts = (await getCollection('blog', isVisible)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
  );

  return new Response(
    llmsFull(
      posts.map((p) => ({
        id: p.id,
        title: p.data.title,
        date: p.data.pubDate,
        body: p.body ?? '',
      })),
    ),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
}
