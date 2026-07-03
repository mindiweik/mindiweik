# Projects Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give each project its own detail page, replace synthesized changelog dates with real activity dates, and refresh the lineup to 5 projects.

**Architecture:** Mirror the blog pattern: markdown body = long description, `[...slug].astro` + a new `ProjectLayout`. A small `src/lib/github.ts` fetches repo activity at build time (cached per URL, never throws). Changelog dates use the chain `lastUpdated` (manual frontmatter) → GitHub `pushedAt` → Jan 1 of `since`.

**Tech Stack:** Astro 7, TypeScript, zod (content schema), vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-projects-revamp-design.md`

## Global Constraints

- Work happens in worktree `/Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/projects-revamp`, branch `feat/projects-revamp`. Never touch main or other worktrees.
- Content voice: all-lowercase headings and titles, conversational, no emdashes anywhere (use commas, periods, or parentheses instead).
- Content files are `.md`, not `.mdx` (site convention).
- A GitHub API failure must NEVER fail the build; it degrades to "no last-active data".
- No live network calls in tests; mock `fetch`.
- All existing tests must stay green: run `npx vitest run` from the worktree root.
- Commit messages end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Run all commands from the worktree root: `cd /Users/mindiweik/Desktop/dev.nosync/mindiweik-worktrees/projects-revamp`.

---

### Task 1: GitHub activity fetcher (`src/lib/github.ts`)

**Files:**

- Create: `src/lib/github.ts`
- Test: `src/lib/github.test.ts`

**Interfaces:**

- Produces: `parseGithubRepo(repoUrl: string): { owner: string; name: string } | null`
- Produces: `fetchRepoActivity(repoUrl: string): Promise<{ pushedAt: Date } | null>` (module-level cache per URL; safe to call from many pages in one build)
- Consumes: nothing from other tasks.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/github.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseGithubRepo, fetchRepoActivity, _clearActivityCache } from './github';

describe('parseGithubRepo', () => {
  it('parses a github https URL', () => {
    expect(parseGithubRepo('https://github.com/mindiweik/drip-dash')).toEqual({
      owner: 'mindiweik',
      name: 'drip-dash',
    });
  });
  it('tolerates trailing slash and .git suffix', () => {
    expect(parseGithubRepo('https://github.com/mindiweik/drip-dash/')).toEqual({
      owner: 'mindiweik',
      name: 'drip-dash',
    });
    expect(parseGithubRepo('https://github.com/mindiweik/drip-dash.git')).toEqual({
      owner: 'mindiweik',
      name: 'drip-dash',
    });
  });
  it('returns null for non-github hosts (gitlab stays private)', () => {
    expect(parseGithubRepo('https://gitlab.com/auditioncat/app')).toBeNull();
  });
  it('returns null for garbage', () => {
    expect(parseGithubRepo('not a url')).toBeNull();
    expect(parseGithubRepo('https://github.com/onlyowner')).toBeNull();
  });
});

describe('fetchRepoActivity', () => {
  beforeEach(() => {
    _clearActivityCache();
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns pushedAt from the GitHub API', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ pushed_at: '2026-01-05T12:00:00Z' }),
    });
    const out = await fetchRepoActivity('https://github.com/mindiweik/drip-dash');
    expect(out?.pushedAt.toISOString()).toBe('2026-01-05T12:00:00.000Z');
    expect(fetch).toHaveBeenCalledWith(
      'https://api.github.com/repos/mindiweik/drip-dash',
      expect.anything(),
    );
  });
  it('returns null for non-github URLs without fetching', async () => {
    expect(await fetchRepoActivity('https://gitlab.com/auditioncat/app')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('returns null on HTTP error without throwing', async () => {
    (fetch as any).mockResolvedValue({ ok: false, status: 403 });
    expect(await fetchRepoActivity('https://github.com/mindiweik/drip-dash')).toBeNull();
  });
  it('returns null on network error without throwing', async () => {
    (fetch as any).mockRejectedValue(new Error('boom'));
    expect(await fetchRepoActivity('https://github.com/mindiweik/drip-dash')).toBeNull();
  });
  it('caches per URL (one fetch for two calls)', async () => {
    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ pushed_at: '2026-01-05T12:00:00Z' }),
    });
    await fetchRepoActivity('https://github.com/mindiweik/drip-dash');
    await fetchRepoActivity('https://github.com/mindiweik/drip-dash');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/github.test.ts`
Expected: FAIL with "Cannot find module './github'" (or equivalent).

- [ ] **Step 3: Write the implementation**

Create `src/lib/github.ts`:

```ts
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
    const res = await fetch(`https://api.github.com/repos/${key}`, { headers });
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/github.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/github.ts src/lib/github.test.ts
git commit -m "feat: build-time GitHub repo activity fetcher (cached, never throws)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Real changelog dates (`src/lib/collections.ts`)

**Files:**

- Modify: `src/lib/collections.ts` (the `raw.projects.map` line inside `toChangelogEntries`, and `getChangelog`)
- Test: `src/lib/collections.test.ts` (extend)

**Interfaces:**

- Consumes: `fetchRepoActivity` from Task 1.
- Produces: `toChangelogEntries` now accepts `projects: { id: string; data: any; pushedAt?: Date }[]` (new optional `pushedAt` alongside `data`). Project entries become `type: 'update'`, `url: /projects/{id}`, `date: data.lastUpdated ?? pushedAt ?? new Date(data.since, 0, 1)`.

- [ ] **Step 1: Update the existing test fixture + add new tests**

In `src/lib/collections.test.ts`, the first test's `projects` fixture currently is
`projects: [{ id: 'p', data: { name: 'Proj' } }]`. Change it to
`projects: [{ id: 'p', data: { name: 'Proj', since: 2023 } }]` (the old fixture has no `since`; without this the new date logic yields `Invalid Date`). Then append:

```ts
describe('toChangelogEntries project dates', () => {
  const base = { blog: [], podcast: [], speaking: [] };

  it('labels projects as update and links to the detail page', () => {
    const out = toChangelogEntries({
      ...base,
      projects: [{ id: 'drip-dash', data: { name: 'Drip Dash', since: 2025 } }],
    });
    expect(out[0].type).toBe('update');
    expect(out[0].url).toBe('/projects/drip-dash');
  });

  it('prefers manual lastUpdated over pushedAt', () => {
    const out = toChangelogEntries({
      ...base,
      projects: [
        {
          id: 'ac',
          data: { name: 'AC', since: 2023, lastUpdated: new Date('2026-05-01') },
          pushedAt: new Date('2026-06-01'),
        },
      ],
    });
    expect(out[0].date.toISOString()).toBe(new Date('2026-05-01').toISOString());
  });

  it('falls back to pushedAt, then Jan 1 of since', () => {
    const withPush = toChangelogEntries({
      ...base,
      projects: [{ id: 'a', data: { name: 'A', since: 2023 }, pushedAt: new Date('2026-06-01') }],
    });
    expect(withPush[0].date.toISOString()).toBe(new Date('2026-06-01').toISOString());
    const bare = toChangelogEntries({
      ...base,
      projects: [{ id: 'b', data: { name: 'B', since: 2023 } }],
    });
    expect(bare[0].date.getTime()).toBe(new Date(2023, 0, 1).getTime());
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/lib/collections.test.ts`
Expected: the 3 new tests FAIL (type is still `'ship'`, URL still `/projects#...`); pre-existing tests still pass.

- [ ] **Step 3: Update `collections.ts`**

Change the `projects` member of the `raw` parameter type from
`projects: { id: string; data: any }[]` to
`projects: { id: string; data: any; pushedAt?: Date }[]`, and replace the projects mapping line with:

```ts
    ...raw.projects.map((e) => ({
      type: 'update',
      zone: 'projects' as ZoneKey,
      title: e.data.name,
      url: `/projects/${e.id}`,
      date: e.data.lastUpdated ?? e.pushedAt ?? new Date(e.data.since, 0, 1),
    })),
```

Then make `getChangelog` enrich projects with activity. Add the import at the top:

```ts
import { fetchRepoActivity } from './github';
```

and replace the body of `getChangelog` with:

```ts
export async function getChangelog(limit?: number): Promise<ChangelogEntry[]> {
  const [blog, podcast, speaking, projects] = await Promise.all([
    getCollection('blog', isVisible),
    getCollection('podcast', isVisible),
    getCollection('speaking', isVisible),
    getCollection('projects'),
  ]);
  const enriched = await Promise.all(
    projects.map(async (p) => ({
      ...p,
      pushedAt: p.data.repoUrl ? (await fetchRepoActivity(p.data.repoUrl))?.pushedAt : undefined,
    })),
  );
  const all = toChangelogEntries({ blog, podcast, speaking, projects: enriched });
  return limit ? all.slice(0, limit) : all;
}
```

- [ ] **Step 4: Run the full suite**

Run: `npx vitest run`
Expected: all tests PASS (existing 49 + Task 1's 9 + these 3; the first-fixture edit keeps the original assertion `title === 'Proj'` green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/collections.ts src/lib/collections.test.ts
git commit -m "feat: changelog project entries use real dates (lastUpdated > pushedAt > since)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Schema + existing frontmatter (`content.config.ts`)

**Files:**

- Modify: `src/content.config.ts` (projects collection only)
- Modify: `src/content/projects/audition-cat.md` (frontmatter only)
- Modify: `src/content/projects/drip-dash.md` (frontmatter only)

**Interfaces:**

- Produces: projects schema fields `since: number` (required), `lastUpdated?: Date`, `image?` (Astro image), `imageAlt?: string` with a refine rule "imageAlt required when image set". Tasks 4 and 6 rely on these exact names.
- Consumes: nothing.

- [ ] **Step 1: Update the schema**

In `src/content.config.ts`, replace the `projects` collection definition with (note the schema becomes a **function** to get the `image` helper):

```ts
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z
      .object({
        name: z.string(),
        blurb: z.string(),
        status: z.enum(['alpha', 'live', 'wip', 'archived']),
        stack: z.array(z.string()).default([]),
        url: z.string().optional(),
        repoUrl: z.string().optional(),
        featured: z.boolean().default(false),
        order: z.number().optional(),
        since: z.number(),
        lastUpdated: z.coerce.date().optional(),
        image: image().optional(),
        imageAlt: z.string().optional(),
      })
      .refine((d) => !d.image || !!d.imageAlt, {
        message: 'imageAlt is required when image is set',
      }),
});
```

- [ ] **Step 2: Add `since` to the two existing files**

`audition-cat.md` frontmatter becomes (body untouched for now; Task 6 adds it):

```yaml
---
name: Audition Cat
blurb: A platform for actors to organize auditions and self-tapes. Founding engineer.
status: alpha
stack: [TypeScript, Node, PostgreSQL, React]
featured: true
order: 1
since: 2023
---
```

`drip-dash.md` frontmatter becomes:

```yaml
---
name: Drip Dash
blurb: A dashboard for Gardyn hydroponic systems.
status: wip
stack: [TypeScript, React]
order: 2
since: 2025
repoUrl: https://github.com/mindiweik/drip-dash
---
```

- [ ] **Step 3: Verify the build accepts the schema**

Run: `npm run build`
Expected: build succeeds. (It may log `[github] ...` warnings if offline; that is fine by design.)

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/projects/audition-cat.md src/content/projects/drip-dash.md
git commit -m "feat: projects schema gains since/lastUpdated/image; real frontmatter for existing projects

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Detail pages (`ProjectLayout` + `[...slug].astro`)

**Files:**

- Create: `src/layouts/ProjectLayout.astro`
- Create: `src/pages/projects/[...slug].astro`

**Interfaces:**

- Consumes: `fetchRepoActivity` (Task 1); schema fields (Task 3).
- Produces: route `/projects/{id}` for every projects entry. Task 5 links to it.

- [ ] **Step 1: Create `src/layouts/ProjectLayout.astro`**

Follows `ArticleLayout.astro`'s structure and inline-style idiom; link buttons copy the exact style used in `EpisodeLayout.astro` line 58.

```astro
---
import BaseLayout from './BaseLayout.astro';
import Breadcrumb from '../components/content/Breadcrumb.astro';
import VersionChip from '../components/content/VersionChip.astro';
import { Image } from 'astro:assets';
import '../styles/prose.css';

interface Props {
  name: string;
  slug: string;
  status: string;
  stack: string[];
  since: number;
  featured: boolean;
  pushedAt?: Date | null;
  url?: string;
  repoUrl?: string;
  image?: ImageMetadata;
  imageAlt?: string;
}
const { name, slug, status, stack, since, featured, pushedAt, url, repoUrl, image, imageAlt } =
  Astro.props;

const fmtMonth = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toLowerCase();
// AC (no fetchable repo) reads "since 2023 · ongoing"; repos read "since 2025 · last commit jan 2026".
const metaParts = [`since ${since}`];
if (pushedAt) metaParts.push(`last commit ${fmtMonth(pushedAt)}`);
else if (status !== 'archived') metaParts.push('ongoing');
const meta = metaParts.join(' · ');

const links = [
  ...(url ? [{ label: 'visit site', href: url }] : []),
  ...(repoUrl ? [{ label: 'github', href: repoUrl }] : []),
];
---

<BaseLayout title={name} active="/projects">
  <Breadcrumb path={`~/projects/${slug}.md`} />
  <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;margin-top:0.7rem">
    <VersionChip label={status} zone="projects" />
    {
      stack.map((s) => (
        <span style="font-family:var(--font-mono);font-size:0.62rem;color:var(--text-muted)">
          {s}
        </span>
      ))
    }
  </div>
  <h1
    style="font-family:var(--font-display);font-weight:700;font-size:1.8rem;line-height:1.1;letter-spacing:-0.02em;margin:0.8rem 0 0"
  >
    {name}{featured ? ' ★' : ''}
  </h1>
  <div
    style="font-family:var(--font-mono);font-size:0.62rem;color:var(--text-muted);margin-top:0.6rem"
  >
    {meta}
  </div>
  {
    image && (
      <Image
        src={image}
        alt={imageAlt ?? ''}
        style="margin-top:1.2rem;width:100%;height:auto;border-radius:10px;border:1px solid var(--border)"
      />
    )
  }
  <article class="prose" style="margin-top:1.2rem"><slot /></article>
  {
    links.length > 0 && (
      <div style="margin-top:1.6rem;display:flex;flex-wrap:wrap;gap:0.5rem">
        {links.map((l) => (
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            style="font-family:var(--font-mono);font-size:0.7rem;padding:0.35rem 0.6rem;border:1px solid var(--border);border-radius:6px"
          >
            {l.label} →
          </a>
        ))}
      </div>
    )
  }
</BaseLayout>
```

- [ ] **Step 2: Create `src/pages/projects/[...slug].astro`**

```astro
---
import { getCollection, render } from 'astro:content';
import ProjectLayout from '../../layouts/ProjectLayout.astro';
import { fetchRepoActivity } from '../../lib/github.ts';

export async function getStaticPaths() {
  const projects = await getCollection('projects');
  return projects.map((project) => ({ params: { slug: project.id }, props: { project } }));
}
const { project } = Astro.props;
const { Content } = await render(project);
const activity = project.data.repoUrl ? await fetchRepoActivity(project.data.repoUrl) : null;
---

<ProjectLayout
  name={project.data.name}
  slug={project.id}
  status={project.data.status}
  stack={project.data.stack}
  since={project.data.since}
  featured={project.data.featured}
  pushedAt={activity?.pushedAt}
  url={project.data.url}
  repoUrl={project.data.repoUrl}
  image={project.data.image}
  imageAlt={project.data.imageAlt}
>
  <Content />
</ProjectLayout>
```

- [ ] **Step 3: Verify the pages build**

Run: `npm run build && ls dist/projects/`
Expected: build succeeds; `dist/projects/` contains `audition-cat/` and `drip-dash/` directories (plus `index.html`).

- [ ] **Step 4: Commit**

```bash
git add src/layouts/ProjectLayout.astro "src/pages/projects/[...slug].astro"
git commit -m "feat: project detail pages (ProjectLayout + slug route)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Index cards navigate internally

**Files:**

- Modify: `src/pages/projects/index.astro`

**Interfaces:**

- Consumes: route `/projects/{id}` (Task 4).
- Produces: nothing new.

- [ ] **Step 1: Change the card href**

In `src/pages/projects/index.astro`, replace

```astro
href={p.data.url ?? p.data.repoUrl ?? '#'}
```

with

```astro
href={`/projects/${p.id}`}
```

- [ ] **Step 2: Verify**

Run: `npm run build && grep -o 'href="/projects/[a-z-]*"' dist/projects/index.html | sort -u`
Expected: one `href="/projects/..."` per project; no `href="#"` anywhere in the file.

- [ ] **Step 3: Commit**

```bash
git add src/pages/projects/index.astro
git commit -m "feat: project cards link to detail pages (kills the # fallback)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Content for all five projects

**Files:**

- Modify: `src/content/projects/audition-cat.md` (add body)
- Modify: `src/content/projects/drip-dash.md` (add body)
- Create: `src/content/projects/mindiweik-site.md`
- Create: `src/content/projects/catz4life.md`
- Create: `src/content/projects/prettykitties.md`

**Interfaces:**

- Consumes: schema (Task 3).
- Produces: the five entries Mindi reviews. ALL COPY BELOW IS DRAFT, flagged for Mindi's voice pass before merge.

Content rules (from Mindi's profile): lowercase headings, conversational, vulnerable, practical, no emdashes, tech metaphors welcome. Audition Cat stays VAGUE: no user numbers, no roadmap, no cofounder details.

- [ ] **Step 1: Add the Audition Cat body**

Append below the frontmatter in `audition-cat.md`:

```markdown
audition cat is a platform that helps actors keep their auditions, self-tapes, and callbacks organized in one place, so the admin side of an acting career stops living in spreadsheets and camera rolls.

## the story

i joined as the founding software engineer three years ago, which means i have been here for every schema migration, every "wait, why did we build it that way", and every small win since day one. it is a side project in the truest sense: built in the hours around a day job, at a pace that real life allows.

## how it's built

typescript on both sides. node and express on the api, postgresql underneath, react in front. boring on purpose, in the best way: the interesting problems should be product problems, not framework problems.

## where it's at

alpha. real actors are using it and telling us what hurts, which is both the scariest and the most useful phase a product can be in.
```

- [ ] **Step 2: Add the Drip Dash body**

Append below the frontmatter in `drip-dash.md`:

```markdown
drip dash is a dashboard for gardyn hydroponic systems. i have two of them growing things in my house at all times, and the official app never quite showed me what i actually wanted to know.

## the story

classic scratch-your-own-itch project. i wanted one screen that answered "how are the plants doing", so i started building it.

## how it's built

typescript and react. it talks to the gardyn side and turns the data into something glanceable.

## where it's at

honestly? dormant, but on the shortlist to revisit. saying that publicly is half the motivation strategy.
```

- [ ] **Step 3: Create `mindiweik-site.md`**

```markdown
---
name: mindiweik.com
blurb: This site. Astro, auto-deployed, blog + podcast + speaking under one roof.
status: live
stack: [Astro, TypeScript]
url: https://mindiweik.com
repoUrl: https://github.com/mindiweik/mindiweik
order: 3
since: 2026
---

the site you are reading right now. my blog, the [WIP] podcast archive, speaking history, and these project pages, all under one roof after years of living on separate platforms.

## the story

this started as "i should move off the website builder" and turned into a full migration: the wip-podcast.com site folded in with 301s, substack posts imported, and everything rebuilt as a static site i actually own. i wrote about the why in [why i rebuilt my site](/blog/why-i-rebuilt-my-site).

## how it's built

astro with content collections, deployed to hostinger over ftp by github actions on every push. a daily rebuild releases scheduled posts, drafts get a password-protected preview subdomain, and the 404 page does fuzzy "did you mean" suggestions. the repo is public if you want to poke around.

## where it's at

live and evolving. the changelog on the home page is the honest record.
```

- [ ] **Step 4: Create `catz4life.md`**

```markdown
---
name: catz4life
blurb: A deliberately broken cat adoption page for learning browser DevTools.
status: live
stack: [JavaScript, HTML, CSS]
repoUrl: https://github.com/mindiweik/catz4life
order: 4
since: 2025
---

the catz4life adopshun centre is a very broken cat adoption page, on purpose. your mission: fix it using nothing but your browser's devtools.

## the story

i built it to support a talk i gave about the browser, the same material that became my four-part devtools series here on the blog, starting with [unlocking your browser](/blog/unlocking-your-browser). slides only get you so far; fixing a real broken page is where devtools actually clicks.

## what it does

it is a scavenger hunt. a broken headline to fix in the elements tab, a failed api call to chase down in the network tab, a busted adopt button for the console, and a theme toggle hiding in local storage. each bug teaches one tab.

## where it's at

done and reusable. if you are learning devtools, clone it and go break things (well, fix things).
```

- [ ] **Step 5: Create `prettykitties.md`**

```markdown
---
name: prettykitties
blurb: A quick TypeScript + React app from my first year as an engineer.
status: archived
stack: [TypeScript, React]
repoUrl: https://github.com/mindiweik/prettykitties
order: 5
since: 2023
---

a small typescript and react app from 2023, fresh out of hack reactor. it fetches cats and it shows you cats. that is the app.

## the story

i keep it listed because hiding your early work is tempting and dishonest. this is what my code looked like when everything was new: create react app, a public api, and a lot of learning between the commits.

## where it's at

archived. it did its job, which was teaching me. (also there is a cat theme developing on this page and i refuse to apologize for it.)
```

- [ ] **Step 6: Verify the full build**

Run: `npm run build && ls dist/projects/`
Expected: build succeeds; `dist/projects/` now contains `audition-cat/`, `drip-dash/`, `mindiweik-site/`, `catz4life/`, `prettykitties/`.

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add src/content/projects/
git commit -m "content: project bodies for all five projects (draft copy for Mindi's review)

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Authenticated GitHub API in deploys

**Files:**

- Modify: `.github/workflows/deploy.yml` (both `npm run build` steps)

**Interfaces:**

- Consumes: `GITHUB_TOKEN` env read in Task 1's `github.ts`.
- Produces: authenticated (higher rate limit) API calls in CI.

- [ ] **Step 1: Pass the token to the prod build step**

Change:

```yaml
- run: npm ci
- run: npm run build
```

to:

```yaml
- run: npm ci
- run: npm run build
  env:
    GITHUB_TOKEN: ${{ github.token }}
```

- [ ] **Step 2: Pass the token to the dev preview build step**

Change:

```yaml
- name: Build dev preview (drafts + scheduled visible)
  run: npm run build
  env:
    PUBLIC_SHOW_DRAFTS: 'true'
    DEPLOY_SITE: 'https://dev.mindiweik.com'
```

to:

```yaml
- name: Build dev preview (drafts + scheduled visible)
  run: npm run build
  env:
    PUBLIC_SHOW_DRAFTS: 'true'
    DEPLOY_SITE: 'https://dev.mindiweik.com'
    GITHUB_TOKEN: ${{ github.token }}
```

- [ ] **Step 3: Sanity-check the workflow file**

Run: `npx yaml-lint .github/workflows/deploy.yml 2>/dev/null || node -e "require('js-yaml') && console.log('skip')" 2>/dev/null || python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/deploy.yml')); print('yaml ok')"`
Expected: `yaml ok` (or a clean lint). If none of the tools exist, visually diff the two edits only.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: authenticate build-time GitHub API calls with the Actions token

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Bookkeeping + final verification

**Files:**

- Modify: `docs/followups.md`

**Interfaces:**

- Consumes: everything prior.
- Produces: a branch ready for Mindi's content review + merge.

- [ ] **Step 1: Mark the follow-up resolved**

In `docs/followups.md`, remove the "Projects revamp (post-migration)" block (lines 7-12, the bullet and its two sub-bullets) from the open list, and add at the TOP of the `## Resolved` section:

```markdown
- ~~**Projects revamp**~~ -> shipped 2026-07-03. Five projects (Audition Cat ★,
  Drip Dash, mindiweik.com, catz4life, prettykitties), each with a detail page
  (markdown body via ProjectLayout, same pattern as blog). Cards navigate
  internally; the `#` fallback and the synthesized changelog dates are gone.
  Changelog project entries are type `update`, dated lastUpdated (manual, for
  Audition Cat milestones) -> GitHub pushedAt (build-time fetch, fresh daily via
  cron) -> Jan 1 of `since`. Screenshots pending from Mindi (image/imageAlt
  fields are wired). GitLab API for AC = deliberately skipped.
```

- [ ] **Step 2: Full verification**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds with 5 project pages in `dist/projects/`.

- [ ] **Step 3: Commit**

```bash
git add docs/followups.md
git commit -m "docs: mark projects revamp follow-up resolved

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Hand back to Mindi**

Do NOT merge or push. Mindi still needs to: review all five content bodies (voice pass; catz4life origin + AC vagueness check), confirm the `since` years, and provide screenshots (optional, can land later). Merging follows the superpowers:finishing-a-development-branch flow after her review.
