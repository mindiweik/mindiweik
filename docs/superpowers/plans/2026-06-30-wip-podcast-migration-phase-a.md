# wip-podcast.com Migration — Phase A (Content) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all 58 content pages from wip-podcast.com and rebuild them as Astro content files on mindiweik.com (blog, podcast, speaking), plus harvest the `/mindi` bio into the About page — then deploy. (Redirects = Phase B, GSC = Phase C; both out of scope here.)

**Architecture:** A small tested Node helper pulls clean frontmatter from each page's JSON-LD. The article body is converted to markdown per page (code blocks preserved, light-touch de-brand) and written into the matching content collection. One worked example per content type locks the conventions before bulk migration. The `speaking` schema gains a `guest` type for the 5 guest appearances.

**Tech Stack:** Astro 7 (static, content collections), TypeScript, vitest (node env), Node 22 (`fetch`, `node:test` not needed — vitest).

## Global Constraints

- Astro version is 7. Keep the build green (`npm run build`) and tests green (`npm test`) at every commit.
- Content fidelity = **light touch**: preserve substance; de-brand only. No rewriting.
- **Preserve code blocks** as fenced markdown with language hints where detectable.
- **Text only** — no hero images, no image downloads, no `heroImage` schema field.
- `localStorage`/redirects/GSC are NOT in this plan (Phases B/C).
- Commits must NOT include `Co-Authored-By` trailers.
- Do NOT push (no deploy) until the final task; Phase A ships as one deploy after full verification.
- Writing rule: no emdashes in any prose/copy.

## Shared migration procedure (referenced by Tasks 3-6)

**Slug rules:**
- Blog: old `NN-title-words` → `title-words` (strip leading `NN-`). File: `src/content/blog/<slug>.md`.
- Podcast: old `vABC-name` → version `vA.B.C`, slug `vA-B-C-name`, season = `A`. File: `src/content/podcast/<slug>.md`. (`v0010` → `v0.0.10`, slug `v0-0-10-joram-mutenge`.)
- Speaking: slug = old path (talks) or a kebab of the title (guests). File: `src/content/speaking/<slug>.md`.

**Frontmatter templates** (fill from JSON-LD via the helper + body):

Blog:
```md
---
title: <headline, lowercased to match site voice>
description: <JSON-LD description>
pubDate: <JSON-LD datePublished YYYY-MM-DD>
tags: [<articleSection items, lowercased>]
readingTime: <timeRequired minutes as number, omit if absent>
---
```
Podcast:
```md
---
title: <episode title, lowercased>
guest: <guest full name, omit for solo/release-notes>
version: vA.B.C
season: <A>
pubDate: <date YYYY-MM-DD>
duration: <"NN min" if present, else omit>
---
```
Speaking (talk):
```md
---
title: <talk title, lowercased>
event: <event/host name>
date: <date YYYY-MM-DD>
type: talk
description: <one-line>
links: [{ label: <where>, url: <original> }]
---
```
Speaking (guest):
```md
---
title: <appearance title, lowercased>
event: <host show / channel>
date: <date YYYY-MM-DD>
type: guest
description: <one-line>
links: [{ label: listen/watch, url: <original appearance URL> }]
---
```

**Light-touch de-brand rules** (apply to body + frontmatter text):
- Replace "[WIP] Podcast" / "the [WIP] show" / "[WIP] Blog" with a neutral reference ("the podcast", "this blog") or drop it.
- "join us" / "we're figuring it out" / first-person-plural "we"/"our" → "I"/"my" where the subject is clearly Mindi solo. Leave "we" when it refers to a guest conversation.
- Remove trailing site furniture that leaked into the body: "Connect", "Support the [WIP] show", "Start over", "mindi@wip-podcast.com", "© 2026", nav crumbs ("Show Notes Blog Gratitude Support").
- Do not rewrite sentences for style; only de-brand and de-furniture.

**Body→markdown rules:**
- Headings, lists, links, bold/italic preserved.
- Code: any `<pre>`/`<code>` block → fenced ```` ``` ```` with a language hint inferred from content (ts/js/bash/json) when obvious, else a bare fence.
- Strip the repeated top nav and footer furniture (see de-brand list).

---

### Task 1: Add `guest` type to speaking (schema + render + changelog)

**Files:**
- Modify: `src/content.config.ts` (speaking `type` enum)
- Modify: `src/pages/speaking/index.astro` (render guest entries)
- Modify: `src/lib/collections.ts` (changelog type from `data.type`)
- Test: `src/lib/collections.test.ts` (extend existing)

**Interfaces:**
- Consumes: nothing.
- Produces: `speaking.type` accepts `'guest'`; `/speaking` shows guest entries; `toChangelogEntries` emits speaking entry `type` from `data.type` (default `'talk'`).

- [ ] **Step 1: Write the failing test** — extend `src/lib/collections.test.ts` with a case asserting a guest speaking entry maps to changelog `type: 'guest'`:

```ts
import { describe, it, expect } from 'vitest';
import { toChangelogEntries } from './collections.ts';

describe('toChangelogEntries speaking type', () => {
  it('uses the entry type for speaking (guest vs talk)', () => {
    const out = toChangelogEntries({
      blog: [], podcast: [], projects: [],
      speaking: [
        { id: 'a-guest', data: { title: 'on a show', type: 'guest', date: new Date('2025-01-01') } },
        { id: 'a-talk', data: { title: 'my talk', date: new Date('2025-02-01') } },
      ],
    });
    const guest = out.find((e) => e.title === 'on a show');
    const talk = out.find((e) => e.title === 'my talk');
    expect(guest?.type).toBe('guest');
    expect(talk?.type).toBe('talk');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- collections`
Expected: FAIL — guest entry currently maps to `'talk'`.

- [ ] **Step 3: Implement** — three edits.

`src/content.config.ts`, speaking schema:
```ts
    type: z.enum(['talk', 'workshop', 'panel', 'guest']).optional(),
```

`src/lib/collections.ts`, the speaking map line inside `toChangelogEntries`:
```ts
    ...raw.speaking.map((e) => ({ type: e.data.type === 'guest' ? 'guest' : 'talk', zone: 'speaking' as ZoneKey, title: e.data.title, url: `/speaking#${e.id}`, date: e.data.date })),
```

`src/pages/speaking/index.astro` — split talks vs guests and label guests. Replace the body with:
```astro
---
import ZoneIndexLayout from '../../layouts/ZoneIndexLayout.astro';
import EntryCard from '../../components/content/EntryCard.astro';
import { getCollection } from 'astro:content';

const all = (await getCollection('speaking'))
  .sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
const talks = all.filter((t) => t.data.type !== 'guest');
const guests = all.filter((t) => t.data.type === 'guest');
const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
const linkFor = (t: any) => t.data.slidesUrl ?? t.data.recordingUrl ?? t.data.links?.[0]?.url ?? '#';
---
<ZoneIndexLayout zone="speaking" heading="speaking" sub="workshops, talks, and panels.">
  {talks.map((t) => (
    <EntryCard
      href={linkFor(t)}
      title={t.data.title}
      meta={`${t.data.event} · ${fmt(t.data.date)}${t.data.location ? ' · ' + t.data.location : ''}`}
      zone="speaking"
    />
  ))}
  {guests.length > 0 && (
    <div style="margin-top:2rem">
      <div style="font-family:var(--font-mono);font-size:0.65rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.4rem">// guest appearances</div>
      {guests.map((t) => (
        <EntryCard
          href={linkFor(t)}
          title={t.data.title}
          meta={`${t.data.event} · ${fmt(t.data.date)}`}
          zone="speaking"
        />
      ))}
    </div>
  )}
</ZoneIndexLayout>
```

- [ ] **Step 4: Run test + build**

Run: `npm test -- collections && npm run build`
Expected: tests PASS; build "Complete!" (no guest entries yet, so `/speaking` unchanged visually).

- [ ] **Step 5: Commit**

```bash
git add src/content.config.ts src/lib/collections.ts src/pages/speaking/index.astro src/lib/collections.test.ts
git commit -m "feat: add guest type to speaking (schema, render, changelog)"
```

---

### Task 2: Tested metadata-extraction helper

**Files:**
- Create: `scripts/wip-extract.mjs`
- Create: `scripts/wip-extract.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: `parseMeta(html: string): { title, description, datePublished, readingTimeMin, sections: string[], type }` — pulls fields from the page's JSON-LD. Removable after migration.

- [ ] **Step 1: Write the failing test** — `scripts/wip-extract.test.mjs`:

```js
import { describe, it, expect } from 'vitest';
import { parseMeta } from './wip-extract.mjs';

const sample = `<html><head><script type="application/ld+json">
{"@type":"Article","headline":"Exploring TypeScript Primitive Types","description":"TS 7 primitive types.","datePublished":"2025-01-14T00:00:00.000Z","timeRequired":"PT6M","articleSection":["TypeScript"]}
</script></head><body>hi</body></html>`;

describe('parseMeta', () => {
  it('extracts JSON-LD fields', () => {
    const m = parseMeta(sample);
    expect(m.title).toBe('Exploring TypeScript Primitive Types');
    expect(m.description).toBe('TS 7 primitive types.');
    expect(m.datePublished).toBe('2025-01-14');
    expect(m.readingTimeMin).toBe(6);
    expect(m.sections).toEqual(['TypeScript']);
    expect(m.type).toBe('Article');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- wip-extract`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement** — `scripts/wip-extract.mjs`:

```js
// One-off migration helper: pull frontmatter fields from a wip-podcast.com page's JSON-LD.
// Safe to delete after the migration is complete.
export function parseMeta(html) {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  let ld = {};
  for (const b of blocks) {
    try {
      const obj = JSON.parse(b[1].trim());
      if (obj['@type'] && obj['@type'] !== 'WebSite') { ld = obj; break; }
      if (!ld['@type']) ld = obj;
    } catch {}
  }
  const iso = ld.datePublished ? String(ld.datePublished).slice(0, 10) : null;
  const tr = typeof ld.timeRequired === 'string' ? ld.timeRequired.match(/PT(\d+)M/) : null;
  return {
    title: ld.headline || ld.name || null,
    description: ld.description || null,
    datePublished: iso,
    readingTimeMin: tr ? Number(tr[1]) : null,
    sections: Array.isArray(ld.articleSection) ? ld.articleSection : (ld.articleSection ? [ld.articleSection] : []),
    type: ld['@type'] || null,
  };
}

// CLI: `node scripts/wip-extract.mjs <url>` prints parsed meta + raw HTML length.
if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const html = await (await fetch(url)).text();
  console.log(JSON.stringify(parseMeta(html), null, 2));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- wip-extract`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add scripts/wip-extract.mjs scripts/wip-extract.test.mjs
git commit -m "chore: add tested wip-podcast metadata extraction helper"
```

---

### Task 3: Worked examples — one per content type

Migrate four pages by hand to lock conventions before bulk. Use the Shared migration procedure.

**Files:**
- Create: `src/content/blog/exploring-typescript-primitive-types.md` (from `/18-exploring-typescript-primitive-types`)
- Create: `src/content/podcast/v0-0-10-joram-mutenge.md` (from `/v0010-joram-mutenge`)
- Create: `src/content/speaking/the-case-of-the-curious-engineer-talk.md` (from `/the-case-of-the-curious-engineer-talk`)
- Create: `src/content/speaking/linkedin-live-thriving-in-tech-with-adhd.md` (from `/linkedin-live-thriving-in-tech-with-adhd`, type `guest`)

- [ ] **Step 1: Extract metadata for each** — run the helper:

```bash
node scripts/wip-extract.mjs https://www.wip-podcast.com/18-exploring-typescript-primitive-types
node scripts/wip-extract.mjs https://www.wip-podcast.com/v0010-joram-mutenge
node scripts/wip-extract.mjs https://www.wip-podcast.com/the-case-of-the-curious-engineer-talk
node scripts/wip-extract.mjs https://www.wip-podcast.com/linkedin-live-thriving-in-tech-with-adhd
```
Expected: JSON with title/description/date/readingTime/sections per page.

- [ ] **Step 2: Fetch + convert each body to markdown** — for each URL, `curl -sL <url>`, extract the article body, convert per the Body→markdown rules (preserve the TS code blocks in the primitive-types post), apply de-brand rules, and write the file with the matching frontmatter template. The TS post MUST keep its fenced ```ts code examples.

- [ ] **Step 3: Build + spot-check render**

Run: `npm run build`
Expected: "Complete!", page count +4. Then verify in `dist/`:
```bash
grep -c "<pre" dist/blog/exploring-typescript-primitive-types/index.html
```
Expected: ≥1 (code block rendered). Open `npm run dev` and eyeball the four pages: code formatting, no "[WIP]"/footer leakage, dates/tags present.

- [ ] **Step 4: Commit**

```bash
git add src/content/blog/exploring-typescript-primitive-types.md src/content/podcast/v0-0-10-joram-mutenge.md "src/content/speaking/the-case-of-the-curious-engineer-talk.md" src/content/speaking/linkedin-live-thriving-in-tech-with-adhd.md
git commit -m "content: migrate worked examples (blog/podcast/talk/guest) from wip-podcast"
```

- [ ] **Step 5: STOP — review checkpoint.** Present the four files to Mindi. Get explicit OK on the de-brand level + formatting before bulk migration. Adjust the Shared procedure if she wants changes.

---

### Task 4: Bulk-migrate blog posts (31 remaining)

**Files:** Create `src/content/blog/<slug>.md` for every numbered post EXCEPT `18` (done in Task 3).

Source URLs (strip `NN-` for slug): `00-learning-its-better-together`, `01-failing-fast`,
`02-mongoose-subdocuments-and-discriminators`, `03-clean-code-by-robert-c-martin`,
`04-how-to-start-working-with-ai`, `05-fundamentals-of-backend-engineering-course-review`,
`06-peek-behind-the-bootcamp-curtain`, `07-experiences-with-a-local-gitlab-runner-part-1`,
`08-learning-typescript`, `09-feeling-inadequate-is-okay`, `10-the-power-of-career-change`,
`11-experiences-with-a-local-gitlab-runner-part2`, `12-3-big-scary-software-engineering-words-explained`,
`13-exploring-typescript-ts-compiler`, `14-exploring-typescript-runtime`,
`15-the-software-engineers-guidebook-by-gergely-orosz`,
`16-dependencies-or-dev-dependencies-that-is-the-question`, `17-capturing-curiosity`,
`19-3-habits-that-helped-me-recover-from-burnout-and-stay-motivated`,
`20-jmeter-performance-testing-part-1`, `21-opportunity-is-knocking`,
`22-jmeter-performance-testing-part-2`, `23-the-hidden-currency-of-connection`,
`24-whats-the-difference`, `25-the-importance-of-open-telemetry`, `26-introducing-wip`,
`27-building-a-compass`, `28-unlocking-your-browser`, `29-your-new-best-friend-the-console`,
`30-whats-actually-happening`, `31-level-up-sources-performance-and-your-playground`.

- [ ] **Step 1: Migrate each** following the Shared procedure (helper for frontmatter, curl+convert for body, de-brand, preserve code blocks). At execution this is parallelizable — dispatch agents in batches (e.g. 8 at a time), each agent handed a subset of URLs and the Shared procedure. Each produces `src/content/blog/<slug>.md`.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: "Complete!"; blog page count = 33 (2 original + 32 migrated). No schema errors.

- [ ] **Step 3: Sanity-check frontmatter** — every file has title/description/pubDate; code-heavy posts (08, 12, 13, 14) contain fenced code:
```bash
for f in 08-learning-typescript 13-exploring-typescript-ts-compiler 14-exploring-typescript-runtime; do echo "$f:"; grep -l '```' src/content/blog/*.md | wc -l; done
ls src/content/blog/*.md | wc -l   # expect 33
```

- [ ] **Step 4: Commit**

```bash
git add src/content/blog
git commit -m "content: migrate 31 blog posts from wip-podcast"
```

---

### Task 5: Bulk-migrate podcast episodes (15 remaining + reconcile 2)

**Files:** Create `src/content/podcast/<vA-B-C-name>.md` for each episode except `v0010` (done in Task 3). RECONCILE the 2 existing files (`v1-0-1-jaidie-vargas.md`, `v1-0-4-anemari-fiser.md`): fill any missing fields (duration, guest, descriptor, show notes body) from the old pages; do NOT create duplicates.

Source URLs → version/slug: `v000-the-first-commit`→v0.0.0, `v001-david-weiss`→v0.0.1,
`v002-christin-martin`→v0.0.2, `v003-brendan-schirmer`→v0.0.3, `v004-colin-j-lacy`→v0.0.4,
`v005-kim-maida`→v0.0.5, `v006-nick-clark`→v0.0.6, `v007-keshia-coriolan`→v0.0.7,
`v008-mara-kaela`→v0.0.8, `v009-grace-dees`→v0.0.9, `v100-release-notes`→v1.0.0 (solo, no guest),
`v102-erik-gross`→v1.0.2, `v103-anna-miller`→v1.0.3. (`v0010`=v0.0.10 done; `v101`,`v104` reconcile.)

- [ ] **Step 1: Migrate/reconcile each** per the Shared procedure (podcast frontmatter template; `guest` from the title's name; `season` = first version digit; body = show notes, de-branded). Parallelizable in a batch.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: "Complete!"; podcast page count = 16 (no dupes). Versions render in the changelog.

- [ ] **Step 3: Check** — 16 files, versions unique:
```bash
ls src/content/podcast/*.md | wc -l            # expect 16
grep -h '^version:' src/content/podcast/*.md | sort | uniq -d   # expect empty (no dup versions)
```

- [ ] **Step 4: Commit**

```bash
git add src/content/podcast
git commit -m "content: migrate 15 episodes + reconcile existing 2 from wip-podcast"
```

---

### Task 6: Migrate talks (4 remaining) + guest appearances (4 remaining)

**Files:** Create speaking files for the remaining talks/guests (Task 3 did 1 talk + 1 guest).

Talks → type `talk`: `building-a-brand-with-linkedin-talk`, `capturing-curiosity-talk`,
`the-software-engineers-guidebook-overview-talk`, `how-to-see-the-invisible-intro-to-opentelemetry`.
Guests → type `guest`: `episode-233-how-mindi-navigated-adhd-bootcamp-burnout-and-landed-a-dev-role`,
`growing-in-tech-insights-from-career-and-real-world-projects-with-mindi-weik`,
`linkedin-live-career-conversations-personal-branding-with-mindi-weik`,
`software-engineering-tales-career-switch-to-software-engineering-with-mindi-weik`.

- [ ] **Step 1: Migrate each** per the Shared procedure (speaking talk/guest templates; `links[0]` = the original appearance URL; `event` = host show/venue; short `description`).

- [ ] **Step 2: Build + verify guests render**

Run: `npm run build`
Expected: "Complete!"; `/speaking` shows the talks plus a "// guest appearances" group.
```bash
ls src/content/speaking/*.md | wc -l   # expect 11 (1 original + 5 talks + 5 guests)
grep -l 'type: guest' src/content/speaking/*.md | wc -l   # expect 5
```

- [ ] **Step 3: Commit**

```bash
git add src/content/speaking
git commit -m "content: migrate talks + guest appearances from wip-podcast"
```

---

### Task 7: Harvest `/mindi` into the About page

**Files:**
- Modify: `src/pages/about.astro` (bio paragraphs)

- [ ] **Step 1: Edit the About bio.** In `src/pages/about.astro`, change "five-plus years" to "10+ years", and weave in the advocacy mission from `/mindi`. Replace the first bio paragraph's tail and add the mission to the community sentence. Specifically:
  - In paragraph 1: `five-plus years leading teams and untangling client relationships in real estate and marketing` → `10+ years leading teams and untangling client relationships in real estate and marketing`.
  - In paragraph 2's community sentence, append the mission: after "speaking and writing", add a clause: `, with a soft spot for amplifying underrepresented folks in tech, especially women and neurodivergent builders.`
  - Keep voice consistent (lowercase, no emdashes, no "Here's the thing").

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: "Complete!". Confirm: `grep -o "10+ years" dist/about/index.html` returns a match; `grep -o "neurodivergent" dist/about/index.html` returns a match.

- [ ] **Step 3: STOP — review checkpoint.** Show Mindi the revised About paragraphs for approval (voice + the harvested mission line).

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro
git commit -m "content: harvest /mindi bio into About (10+ years, advocacy mission)"
```

---

### Task 8: Phase A verification + deploy

**Files:** none (verification + deploy only).

- [ ] **Step 1: Full test + build**

Run: `npm test && npm run build`
Expected: all tests PASS; build "Complete!" with ~70 pages (12 original + 58 migrated), zero errors.

- [ ] **Step 2: Coverage check** — counts match the spec:
```bash
echo "blog:"; ls src/content/blog/*.md* | wc -l        # 33
echo "podcast:"; ls src/content/podcast/*.md | wc -l    # 16
echo "speaking:"; ls src/content/speaking/*.md | wc -l  # 11
```

- [ ] **Step 3: Manual spot-check (`npm run dev`)** — load `/blog`, `/podcast`, `/speaking`, the TS post, one episode, one guest appearance. Verify: code blocks render, no `[WIP]`/footer leakage, dates/tags/versions correct, guest group shows, paragraph spacing reads well.

- [ ] **Step 4: STOP — final Phase A review.** Confirm with Mindi the whole archive looks right before deploy. (This is the Phase A milestone gate from the spec.)

- [ ] **Step 5: Deploy**

```bash
git push origin main
gh run list -R mindiweik/mindiweik --limit 1
```
Wait for the deploy run to succeed, then verify a sample migrated URL is live, e.g.
`curl -sL https://mindiweik.com/blog/exploring-typescript-primitive-types/ | grep -o "<title>[^<]*</title>"`.

- [ ] **Step 6: Note Phase B/C handoff.** Phase A complete. Phase B (redirects: move wip-podcast.com off Builder + `.htaccess`) and Phase C (GSC Change of Address, blocked on mindiweik.com GSC verification) are separate plans.

---

## Self-Review

**Spec coverage:**
- 58 files, 16/32/5/5 split → Tasks 3-6. ✓
- `guest` type (schema + render) → Task 1. ✓
- Slug rules (drop NN-, vABC→vA.B.C) → Shared procedure + Tasks 4/5. ✓
- JSON-LD frontmatter mapping → Task 2 helper + Shared templates. ✓
- Light-touch de-brand + code blocks preserved + text only → Shared procedure, enforced in Task 3 checkpoint. ✓
- Reconcile existing 2 episodes (no dupes) → Task 5. ✓
- `/mindi` harvest + 10+ years → Task 7. ✓
- Phase A deploy as a milestone; redirects/GSC out of scope → Task 8. ✓

**Placeholder scan:** No TBD/TODO. Bulk tasks give exact URL lists + the Shared procedure rather than per-file code (correct: content is data, not code; the procedure is complete). ✓

**Type consistency:** `parseMeta` fields (title/description/datePublished/readingTimeMin/sections/type) consistent across Task 2 def + usage. `speaking.type` enum + `data.type === 'guest'` consistent across Tasks 1/6. Slug/version mapping consistent across Shared procedure + Tasks 3/5. ✓

**Note on TDD:** code tasks (1, 2) are test-first. Content tasks (3-7) are data migration — verified by build + structural greps + human review checkpoints, which is the right test surface for content.
