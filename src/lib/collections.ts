import { getCollection } from 'astro:content';
import type { ZoneKey } from './zones';

export interface ChangelogEntry {
  type: string;   // "essay" | "v1.0.4" | "talk" | "ship"
  zone: ZoneKey;
  title: string;
  url: string;
  date: Date;
}

// Pure, testable. `raw` mirrors the shape getCollection returns.
export function toChangelogEntries(raw: {
  blog: { id: string; data: any }[];
  podcast: { id: string; data: any }[];
  speaking: { id: string; data: any }[];
  projects: { id: string; data: any }[];
}): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [
    ...raw.blog.map((e) => ({ type: 'essay', zone: 'blog' as ZoneKey, title: e.data.title, url: `/blog/${e.id}`, date: e.data.pubDate })),
    ...raw.podcast.map((e) => ({ type: e.data.version, zone: 'podcast' as ZoneKey, title: e.data.title, url: `/podcast/${e.id}`, date: e.data.pubDate })),
    ...raw.speaking.map((e) => ({ type: 'talk', zone: 'speaking' as ZoneKey, title: e.data.title, url: `/speaking#${e.id}`, date: e.data.date })),
    ...raw.projects.map((e) => ({ type: 'ship', zone: 'projects' as ZoneKey, title: e.data.name, url: `/projects#${e.id}`, date: e.data.order ? new Date(2026, 0, e.data.order) : new Date(0) })),
  ];
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getChangelog(limit?: number): Promise<ChangelogEntry[]> {
  const [blog, podcast, speaking, projects] = await Promise.all([
    getCollection('blog', (e) => !e.data.draft),
    getCollection('podcast', (e) => !e.data.draft),
    getCollection('speaking'),
    getCollection('projects'),
  ]);
  const all = toChangelogEntries({ blog, podcast, speaking, projects });
  return limit ? all.slice(0, limit) : all;
}
