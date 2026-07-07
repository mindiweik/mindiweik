import { SITE } from '../config/site.ts';

// JSON-LD builders for search engines and AI answer engines. Pure functions
// so they stay unit-testable; pages render them through JsonLd.astro.

const CONTEXT = 'https://schema.org';
const SERIES_NAME = '[WIP] Podcast';
const PERSON_ID = `${SITE.url}/#person`;

const author = () => ({ '@type': 'Person', '@id': PERSON_ID, name: SITE.author, url: SITE.url });

// Escape < so a value like "</script>" cannot close the inline script tag.
export function serializeJsonLd(schema: object): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}

export function personSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'Person',
    '@id': PERSON_ID,
    name: SITE.author,
    url: SITE.url,
    jobTitle: 'Software Engineer',
    sameAs: SITE.socials.map((s) => s.url),
  };
}

export function websiteSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    author: author(),
  };
}

export function blogPostingSchema(input: {
  title: string;
  description?: string;
  url: string;
  datePublished: Date;
  dateModified?: Date;
  image: string;
  tags?: string[];
}) {
  return {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    url: input.url,
    mainEntityOfPage: input.url,
    datePublished: input.datePublished.toISOString(),
    ...(input.dateModified ? { dateModified: input.dateModified.toISOString() } : {}),
    image: input.image,
    ...(input.tags && input.tags.length > 0 ? { keywords: input.tags.join(', ') } : {}),
    author: author(),
  };
}

export function podcastSeriesSchema() {
  return {
    '@context': CONTEXT,
    '@type': 'PodcastSeries',
    name: SERIES_NAME,
    url: `${SITE.url}/podcast`,
    author: author(),
  };
}

export function podcastEpisodeSchema(input: {
  title: string;
  url: string;
  datePublished: Date;
  description?: string;
  seasonNumber: number;
  episodeNumber?: number;
}) {
  return {
    '@context': CONTEXT,
    '@type': 'PodcastEpisode',
    name: input.title,
    url: input.url,
    datePublished: input.datePublished.toISOString(),
    ...(input.description ? { description: input.description } : {}),
    partOfSeason: { '@type': 'PodcastSeason', seasonNumber: input.seasonNumber },
    ...(input.episodeNumber != null ? { episodeNumber: input.episodeNumber } : {}),
    partOfSeries: { '@type': 'PodcastSeries', name: SERIES_NAME, url: `${SITE.url}/podcast` },
  };
}
