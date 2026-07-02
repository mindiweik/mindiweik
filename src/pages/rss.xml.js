import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE } from '../config/site.ts';
import { isVisible } from '../lib/publish.ts';

export async function GET(context) {
  const posts = (await getCollection('blog', isVisible)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime()
  );

  return rss({
    title: 'mindiweik · blog',
    description: SITE.description,
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
  });
}
