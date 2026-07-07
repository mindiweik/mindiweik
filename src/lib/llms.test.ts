import { describe, it, expect } from 'vitest';
import { llmsIndex, llmsFull } from './llms';

describe('llmsIndex', () => {
  const sections = [
    {
      route: 'blog',
      heading: 'Blog',
      entries: [
        { id: 'my-post', title: 'my post', description: 'a post about things' },
        { id: 'bare-post', title: 'bare post' },
      ],
    },
    { route: 'podcast', heading: 'Podcast', entries: [] },
  ];

  it('starts with the site H1 and a blockquote summary', () => {
    const out = llmsIndex(sections);
    expect(out.startsWith('# mindiweik\n')).toBe(true);
    expect(out).toContain('\n> ');
  });

  it('renders entries as markdown links with canonical URLs', () => {
    const out = llmsIndex(sections);
    expect(out).toContain('- [my post](https://mindiweik.com/blog/my-post/): a post about things');
  });

  it('omits the description suffix when absent', () => {
    const out = llmsIndex(sections);
    expect(out).toContain('- [bare post](https://mindiweik.com/blog/bare-post/)\n');
    expect(out).not.toContain('- [bare post](https://mindiweik.com/blog/bare-post/):');
  });

  it('skips sections with no entries', () => {
    expect(llmsIndex(sections)).not.toContain('## Podcast');
  });

  it('ends with an Optional section linking llms-full.txt', () => {
    const out = llmsIndex(sections);
    expect(out).toContain('## Optional');
    expect(out).toContain('https://mindiweik.com/llms-full.txt');
  });
});

describe('llmsFull', () => {
  const posts = [
    {
      id: 'my-post',
      title: 'my post',
      date: new Date('2026-07-01T00:00:00Z'),
      body: 'Some **markdown** content.\n\nSecond paragraph.',
    },
  ];

  it('renders each post with H2 title, URL, date, and full body', () => {
    const out = llmsFull(posts);
    expect(out).toContain('## my post');
    expect(out).toContain('URL: https://mindiweik.com/blog/my-post/');
    expect(out).toContain('Published: 2026-07-01');
    expect(out).toContain('Some **markdown** content.');
    expect(out).toContain('Second paragraph.');
  });

  it('starts with a site-level H1', () => {
    expect(llmsFull(posts).startsWith('# mindiweik')).toBe(true);
  });
});
