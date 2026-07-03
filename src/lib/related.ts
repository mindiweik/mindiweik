// Pure, testable. Shapes mirror what getCollection returns.
export interface RelatedPost {
  id: string;
  data: { title: string; pubDate: Date; tags?: string[] };
}

export interface Episode {
  id: string;
  data: { title: string; pubDate: Date };
}

const sharedTags = (a: string[], b: string[]) => a.filter((t) => b.includes(t)).length;
const byDateDesc = (a: RelatedPost, b: RelatedPost) =>
  b.data.pubDate.getTime() - a.data.pubDate.getTime();

export function getRelatedPosts<T extends RelatedPost>(
  currentId: string,
  posts: T[],
  limit = 3,
): T[] {
  const current = posts.find((p) => p.id === currentId);
  if (!current) return [];
  const others = posts.filter((p) => p.id !== currentId);
  const scored = others
    .map((p) => ({ post: p, score: sharedTags(current.data.tags ?? [], p.data.tags ?? []) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || byDateDesc(a.post, b.post))
    .map((s) => s.post);
  // No tag overlap anywhere: fall back to the most recent posts.
  const ranked = scored.length > 0 ? scored : [...others].sort(byDateDesc);
  return ranked.slice(0, limit);
}

export function getAdjacentEpisodes<T extends Episode>(
  currentId: string,
  eps: T[],
): { prev: T | null; next: T | null } {
  const timeline = [...eps].sort((a, b) => a.data.pubDate.getTime() - b.data.pubDate.getTime());
  const i = timeline.findIndex((e) => e.id === currentId);
  if (i === -1) return { prev: null, next: null };
  return { prev: timeline[i - 1] ?? null, next: timeline[i + 1] ?? null };
}
