import { getCollection } from 'astro:content';
import { isVisible } from '../lib/publish.ts';
import { llmsIndex, type LlmsSection } from '../lib/llms.ts';

export async function GET() {
  const [posts, episodes, talks, projects] = await Promise.all([
    getCollection('blog', isVisible),
    getCollection('podcast', isVisible),
    getCollection('speaking', isVisible),
    getCollection('projects'),
  ]);

  const sections: LlmsSection[] = [
    {
      route: 'blog',
      heading: 'Blog',
      entries: posts
        .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
        .map((p) => ({ id: p.id, title: p.data.title, description: p.data.description })),
    },
    {
      route: 'podcast',
      heading: 'Podcast',
      entries: episodes
        .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
        .map((e) => ({ id: e.id, title: e.data.title, description: e.data.descriptor })),
    },
    {
      route: 'speaking',
      heading: 'Speaking',
      entries: talks
        .sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
        .map((t) => ({ id: t.id, title: t.data.title, description: t.data.description })),
    },
    {
      route: 'projects',
      heading: 'Projects',
      entries: projects
        .sort((a, b) => (a.data.order ?? 99) - (b.data.order ?? 99))
        .map((pr) => ({ id: pr.id, title: pr.data.name, description: pr.data.blurb })),
    },
  ];

  return new Response(llmsIndex(sections), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
