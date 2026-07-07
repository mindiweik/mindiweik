import { SITE } from '../config/site.ts';
import { canonicalUrl } from './urls.ts';

// Builders for /llms.txt and /llms-full.txt (llmstxt.org format: H1 title,
// blockquote summary, H2 sections of link lists). Pure functions; the
// endpoints in src/pages map collection entries into these shapes.

export interface LlmsEntry {
  id: string;
  title: string;
  description?: string;
}

export interface LlmsSection {
  route: string;
  heading: string;
  entries: LlmsEntry[];
}

export interface LlmsPost {
  id: string;
  title: string;
  date: Date;
  body: string;
}

const entryLine = (route: string, e: LlmsEntry): string => {
  const url = canonicalUrl(`/${route}/${e.id}`, SITE.url);
  return `- [${e.title}](${url})${e.description ? `: ${e.description}` : ''}`;
};

export function llmsIndex(sections: LlmsSection[]): string {
  const parts = [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description} The personal site of ${SITE.author}: blog posts, the [WIP] podcast, talks, and projects.`,
    '',
  ];
  for (const section of sections) {
    if (section.entries.length === 0) continue;
    parts.push(`## ${section.heading}`, '');
    parts.push(...section.entries.map((e) => entryLine(section.route, e)));
    parts.push('');
  }
  parts.push(
    '## Optional',
    '',
    `- [Full blog content](${SITE.url}/llms-full.txt): every published post in full`,
    '',
  );
  return parts.join('\n');
}

export function llmsFull(posts: LlmsPost[]): string {
  const parts = [`# ${SITE.name}: full blog content`, '', `> ${SITE.description}`, ''];
  for (const post of posts) {
    parts.push(
      `## ${post.title}`,
      '',
      `URL: ${canonicalUrl(`/blog/${post.id}`, SITE.url)}`,
      `Published: ${post.date.toISOString().slice(0, 10)}`,
      '',
      post.body.trim(),
      '',
    );
  }
  return parts.join('\n');
}
