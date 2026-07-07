import { describe, it, expect } from 'vitest';
import {
  serializeJsonLd,
  personSchema,
  websiteSchema,
  blogPostingSchema,
  podcastSeriesSchema,
  podcastEpisodeSchema,
} from './schema';

describe('serializeJsonLd', () => {
  it('escapes < so content cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script><b>' })).not.toContain('</script>');
    expect(serializeJsonLd({ name: '</script>' })).toContain('\\u003c');
  });
});

describe('personSchema', () => {
  it('identifies Mindi with sameAs profile links', () => {
    const p = personSchema() as Record<string, unknown>;
    expect(p['@type']).toBe('Person');
    expect(p['@id']).toBe('https://mindiweik.com/#person');
    expect(p.name).toBe('Mindi Weik');
    expect(p.url).toBe('https://mindiweik.com');
    expect(p.sameAs).toContain('https://www.linkedin.com/in/mindiweik/');
    expect(p.sameAs).toContain('https://github.com/mindiweik');
  });
});

describe('websiteSchema', () => {
  it('describes the site with its author', () => {
    const w = websiteSchema() as Record<string, any>;
    expect(w['@type']).toBe('WebSite');
    expect(w.url).toBe('https://mindiweik.com');
    expect(w.author.name).toBe('Mindi Weik');
    expect(w.author['@id']).toBe('https://mindiweik.com/#person');
  });
});

describe('blogPostingSchema', () => {
  const base = {
    title: 'my post',
    url: 'https://mindiweik.com/blog/my-post/',
    datePublished: new Date('2026-07-01T00:00:00Z'),
    image: 'https://mindiweik.com/og/blog.png',
  };

  it('emits headline, ISO dates, and author', () => {
    const b = blogPostingSchema({
      ...base,
      description: 'desc',
      dateModified: new Date('2026-07-03T00:00:00Z'),
      tags: ['ai', 'debugging'],
    }) as Record<string, any>;
    expect(b['@type']).toBe('BlogPosting');
    expect(b.headline).toBe('my post');
    expect(b.datePublished).toBe('2026-07-01T00:00:00.000Z');
    expect(b.dateModified).toBe('2026-07-03T00:00:00.000Z');
    expect(b.keywords).toBe('ai, debugging');
    expect(b.author.name).toBe('Mindi Weik');
    expect(b.author['@id']).toBe('https://mindiweik.com/#person');
    expect(b.mainEntityOfPage).toBe(base.url);
  });

  it('omits optional fields when absent', () => {
    const b = blogPostingSchema(base) as Record<string, unknown>;
    expect(b).not.toHaveProperty('dateModified');
    expect(b).not.toHaveProperty('keywords');
    expect(b).not.toHaveProperty('description');
  });
});

describe('podcast schemas', () => {
  it('series names [WIP] Podcast at /podcast', () => {
    const s = podcastSeriesSchema() as Record<string, any>;
    expect(s['@type']).toBe('PodcastSeries');
    expect(s.name).toBe('[WIP] Podcast');
    expect(s.url).toBe('https://mindiweik.com/podcast');
  });

  it('episode links back to the series with season info', () => {
    const e = podcastEpisodeSchema({
      title: 'v1.0.1 - Jaidie Vargas',
      url: 'https://mindiweik.com/podcast/v1-0-1-jaidie-vargas/',
      datePublished: new Date('2026-01-15T00:00:00Z'),
      seasonNumber: 1,
      episodeNumber: 1,
    }) as Record<string, any>;
    expect(e['@type']).toBe('PodcastEpisode');
    expect(e.partOfSeries.name).toBe('[WIP] Podcast');
    expect(e.partOfSeason.seasonNumber).toBe(1);
    expect(e.episodeNumber).toBe(1);
  });

  it('omits episodeNumber and description when absent', () => {
    const e = podcastEpisodeSchema({
      title: 't',
      url: 'u',
      datePublished: new Date('2026-01-15T00:00:00Z'),
      seasonNumber: 2,
    }) as Record<string, unknown>;
    expect(e).not.toHaveProperty('episodeNumber');
    expect(e).not.toHaveProperty('description');
  });
});
