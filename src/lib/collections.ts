import { getCollection } from 'astro:content';
import type { ZoneKey } from './zones';
import { isVisible } from './publish';
import { fetchRepoActivity } from './github';

export interface ChangelogEntry {
  type: string;   // "blog" | "v1.0.4" | "talk" | "ship"
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
  projects: { id: string; data: any; pushedAt?: Date }[];
}): ChangelogEntry[] {
  const entries: ChangelogEntry[] = [
    ...raw.blog.map((e) => ({ type: 'blog', zone: 'blog' as ZoneKey, title: e.data.title, url: `/blog/${e.id}`, date: e.data.pubDate })),
    ...raw.podcast.map((e) => ({ type: e.data.version, zone: 'podcast' as ZoneKey, title: e.data.title, url: `/podcast/${e.id}`, date: e.data.pubDate })),
    ...raw.speaking.map((e) => ({ type: e.data.type === 'guest' ? 'guest' : 'talk', zone: 'speaking' as ZoneKey, title: e.data.title, url: `/speaking#${e.id}`, date: e.data.date })),
    ...raw.projects.map((e) => ({
      type: 'update',
      zone: 'projects' as ZoneKey,
      title: e.data.name,
      url: `/projects/${e.id}`,
      date: e.data.lastUpdated ?? e.pushedAt ?? new Date(e.data.since, 0, 1),
    })),
  ];
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getChangelog(limit?: number): Promise<ChangelogEntry[]> {
  const [blog, podcast, speaking, projects] = await Promise.all([
    getCollection('blog', isVisible),
    getCollection('podcast', isVisible),
    getCollection('speaking', isVisible),
    getCollection('projects'),
  ]);
  const enriched = await Promise.all(projects.map(async (p) => ({
    ...p,
    pushedAt: p.data.repoUrl ? (await fetchRepoActivity(p.data.repoUrl))?.pushedAt : undefined,
  })));
  const all = toChangelogEntries({ blog, podcast, speaking, projects: enriched });
  return limit ? all.slice(0, limit) : all;
}
