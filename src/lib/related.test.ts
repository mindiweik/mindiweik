import { describe, it, expect } from 'vitest';
import { getRelatedPosts, getAdjacentEpisodes } from './related';

const post = (id: string, tags: string[], pubDate: string) => ({
  id,
  data: { title: id, tags, pubDate: new Date(pubDate) },
});

describe('getRelatedPosts', () => {
  it('ranks posts by shared tag count, most overlap first', () => {
    const posts = [
      post('current', ['typescript', 'learning'], '2026-01-01'),
      post('one-shared', ['typescript'], '2026-02-01'),
      post('two-shared', ['typescript', 'learning'], '2025-01-01'),
      post('none-shared', ['career'], '2026-03-01'),
    ];
    const out = getRelatedPosts('current', posts);
    expect(out.map((p) => p.id)).toEqual(['two-shared', 'one-shared']);
  });

  it('breaks score ties by most recent pubDate', () => {
    const posts = [
      post('current', ['typescript'], '2026-01-01'),
      post('older', ['typescript'], '2024-01-01'),
      post('newer', ['typescript'], '2026-02-01'),
    ];
    const out = getRelatedPosts('current', posts);
    expect(out.map((p) => p.id)).toEqual(['newer', 'older']);
  });

  it('excludes the current post and caps results at the limit', () => {
    const posts = [
      post('current', ['career'], '2026-01-01'),
      post('a', ['career'], '2026-02-01'),
      post('b', ['career'], '2026-03-01'),
      post('c', ['career'], '2026-04-01'),
      post('d', ['career'], '2026-05-01'),
    ];
    const out = getRelatedPosts('current', posts);
    expect(out).toHaveLength(3);
    expect(out.map((p) => p.id)).not.toContain('current');
  });

  it('falls back to most recent posts when nothing shares a tag', () => {
    const posts = [
      post('current', ['ai'], '2026-01-01'),
      post('old', ['career'], '2025-01-01'),
      post('mid', ['typescript'], '2025-06-01'),
      post('new', ['browser'], '2026-02-01'),
    ];
    const out = getRelatedPosts('current', posts);
    expect(out.map((p) => p.id)).toEqual(['new', 'mid', 'old']);
  });
});

const ep = (id: string, pubDate: string) => ({
  id,
  data: { title: id, pubDate: new Date(pubDate) },
});

describe('getAdjacentEpisodes', () => {
  it('returns the chronological previous and next episodes', () => {
    const eps = [
      ep('v1-0-2', '2026-02-01'),
      ep('v1-0-0', '2025-12-01'),
      ep('v1-0-1', '2026-01-01'),
    ];
    const out = getAdjacentEpisodes('v1-0-1', eps);
    expect(out.prev?.id).toBe('v1-0-0');
    expect(out.next?.id).toBe('v1-0-2');
  });

  it('returns null past the ends of the timeline', () => {
    const eps = [ep('first', '2025-01-01'), ep('last', '2026-01-01')];
    expect(getAdjacentEpisodes('first', eps).prev).toBeNull();
    expect(getAdjacentEpisodes('first', eps).next?.id).toBe('last');
    expect(getAdjacentEpisodes('last', eps).next).toBeNull();
  });
});
