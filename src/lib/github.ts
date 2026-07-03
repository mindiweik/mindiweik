// Build-time GitHub activity lookup for project pages + changelog.
// A failed lookup degrades to null; it must never fail the build.

export interface RepoActivity {
  pushedAt: Date;
}

export function parseGithubRepo(repoUrl: string): { owner: string; name: string } | null {
  try {
    const u = new URL(repoUrl);
    if (u.hostname !== 'github.com') return null;
    const [owner, name] = u.pathname
      .replace(/\/+$/, '')
      .replace(/\.git$/, '')
      .split('/')
      .filter(Boolean);
    if (!owner || !name) return null;
    return { owner, name };
  } catch {
    return null;
  }
}

const cache = new Map<string, Promise<RepoActivity | null>>();

export function _clearActivityCache() {
  cache.clear();
}

export function fetchRepoActivity(repoUrl: string): Promise<RepoActivity | null> {
  const repo = parseGithubRepo(repoUrl);
  if (!repo) return Promise.resolve(null);
  const key = `${repo.owner}/${repo.name}`;
  let hit = cache.get(key);
  if (!hit) {
    hit = lookup(key);
    cache.set(key, hit);
  }
  return hit;
}

async function lookup(key: string): Promise<RepoActivity | null> {
  try {
    const headers: Record<string, string> = { Accept: 'application/vnd.github+json' };
    const token = import.meta.env?.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`https://api.github.com/repos/${key}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.warn(`[github] ${key}: HTTP ${res.status}; skipping last-active data`);
      return null;
    }
    const body = await res.json();
    if (!body?.pushed_at) return null;
    return { pushedAt: new Date(body.pushed_at) };
  } catch (err) {
    console.warn(
      `[github] ${key}: ${err instanceof Error ? err.message : err}; skipping last-active data`,
    );
    return null;
  }
}
