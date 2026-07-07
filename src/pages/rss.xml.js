import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';
import { SITE } from '../config/site.ts';
import { isVisible } from '../lib/publish.ts';

const parser = new MarkdownIt();

export async function GET(context) {
  const posts = (await getCollection('blog', isVisible)).sort(
    (a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime(),
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
      // Full post HTML so feed readers and AI ingestion get the whole text,
      // not just the description. Sanitized per the Astro RSS recipe.
      content: sanitizeHtml(parser.render(post.body ?? ''), {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
      }),
    })),
  });
}
