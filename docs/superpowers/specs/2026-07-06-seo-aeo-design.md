# SEO/AEO improvement plan

**Date:** 2026-07-06
**Status:** Phase 1 complete, phases 2-5 pending

## Context

As of 2026-07-06 the site has 96 pages submitted in the sitemap and 0 indexed by Google. Even the homepage sits at "Crawled - currently not indexed." This is the classic new-domain trust problem: Google has crawled the site successfully (robots.txt clean, sitemap error-free, pages fetch fine) but declines to index because the domain has near-zero trust signals and the content previously existed elsewhere (wip-podcast.com, Substack).

The plan attacks this in order of leverage: reclaim existing authority first, then fix on-page fundamentals, then make the site legible to AI answer engines, then build entity signals, then measure.

Goals, in priority order:

1. **Personal brand** - people searching "Mindi Weik" find the site first with a rich result
2. **Blog traffic** - organic search traffic to posts on topic queries
3. **AI citations (AEO)** - get cited by ChatGPT, Claude, Perplexity, and AI Overviews

Podcast discovery is explicitly not a priority for this plan.

## Phase 1: reclaim authority and kill duplicates - DONE

- ✅ 301 redirects from wip-podcast.com to mindiweik.com. Verified 2026-07-06: old root-level slugs (e.g. `/18-exploring-typescript-primitive-types`) 301 to the matching `/blog/` and `/podcast/` URLs on both apex and www. Homepage serves the [WIP] landing page linking to mindiweik.com.
- ✅ Indexing requested in GSC for key URLs.
- ⏸️ Substack duplicates: deprioritized. Duplicate content is not a penalty; the risk is only per-post canonical competition (Google indexing Substack's copy instead of ours for those specific queries). Since the duplicated posts are low-traffic and no new posts go to Substack, leave them alone for now. Revisit in ~2 months: if a specific post's mindiweik.com copy still won't index and we care about it, edit that Substack post down to a stub linking here.

## Phase 2: technical on-page fixes

All in `BaseHead.astro` and layouts unless noted. One PR.

### 2.1 Canonical URLs

Add `<link rel="canonical" href={new URL(Astro.url.pathname, SITE.url).href} />` to `BaseHead.astro`. This is the main defense against duplicate-content ambiguity (Substack, dev subdomain, trailing-slash variants). Verify the dev.mindiweik.com preview build points canonicals at the subdomain via the existing `DEPLOY_SITE` env handling, and confirm dev.mindiweik.com is noindexed or blocked so the preview never competes with production.

### 2.2 JSON-LD structured data

Emit `<script type="application/ld+json">` blocks per page type:

- **Homepage + about:** `Person` (name, jobTitle, url, image, `sameAs` array of LinkedIn, GitHub, GitLab, YouTube profiles) and `WebSite` (name, url). The `sameAs` links are what consolidate "Mindi Weik" as an entity for both Google and AI engines.
- **Blog posts (`ArticleLayout`):** `BlogPosting` with headline, description, datePublished, dateModified (if available), author referencing the Person, image (OG card URL), url.
- **Podcast pages (`EpisodeLayout` + podcast index):** `PodcastEpisode` per episode and `PodcastSeries` on the index. Lower priority than Person/BlogPosting.

Implementation: a small `JsonLd.astro` component (or a `lib/schema.ts` helper) that takes a typed object and serializes it, so each layout composes its own schema without duplicating boilerplate.

### 2.3 Meta tag gaps

- `og:url` (same value as canonical)
- `og:type` should be `article` on blog posts with `article:published_time` (and `article:author`), remain `website` elsewhere. `BaseHead` needs a `type`/`pubDate` prop or similar.
- `twitter:title` and `twitter:description` (currently only card + image are set)
- `meta name="author" content="Mindi Weik"`

### 2.4 Sitemap lastmod

Configure the sitemap integration's `serialize` hook to emit `lastmod` (from `pubDate`/`updatedDate` for content pages) so Google prioritizes recrawling fresh content. Skip pages with no meaningful date rather than faking one.

## Phase 3: AEO (AI answer engines)

### 3.1 llms.txt and llms-full.txt

Generate at build time from the content collections:

- `/llms.txt`: site overview (who Mindi is, what the site covers) plus a linked index of posts, episodes, projects, and speaking pages with one-line descriptions.
- `/llms-full.txt`: the same index expanded with full post text, for agents that want everything in one fetch.

Implementation: Astro endpoints (`src/pages/llms.txt.ts`) following the same pattern as `rss.xml.js`, so they stay in sync with content automatically.

### 3.2 Explicit AI crawler allowances in robots.txt

Add explicit `Allow: /` stanzas for GPTBot, ClaudeBot, Claude-SearchBot, PerplexityBot, and Google-Extended. They are already allowed by the wildcard; making it explicit documents intent and protects against a future wildcard change. Add a comment pointing at `/llms.txt`.

### 3.3 Full-content RSS

`rss.xml.js` currently emits title + description only. Add `content` with the rendered post HTML (sanitized) so feed-based ingestion (AI systems, readers, aggregators) gets full text. `@astrojs/rss` supports a `content` field per item.

### 3.4 Answer-shaped content structure

Editorial guideline going forward, plus a light retrofit pass on the top posts:

- Open each post with a 2-3 sentence TL;DR that states the answer or takeaway plainly. AI engines quote self-contained passages; posts that open with the answer get cited.
- Use question-phrased H2s where they read naturally ("what is a discriminated union?").
- Keep one idea per section so passages stand alone when extracted.

No schema-stuffing (no FAQ markup on non-FAQ content).

## Phase 4: personal brand entity building (non-code, ongoing)

The site's indexing problem is fundamentally a trust problem, and trust comes from links. All of these are legitimate profile links Mindi controls or can request:

1. **Profiles:** LinkedIn website field + featured section, GitHub profile URL + README, GitLab profile, YouTube channel links block, Ko-fi page, Substack about page.
2. **Podcast directories:** episode show notes and show pages (Spotify, Apple, etc.) should link mindiweik.com, not just wip-podcast.com (the redirect covers old links, but new listings should point directly).
3. **Speaking and community:** Colorado Women&TECH pages, conference speaker profiles, any podcast guest appearances. When someone asks for a link, give mindiweik.com rather than LinkedIn.
4. **About page as entity anchor:** ensure it states name, role, and projects in plain crawlable text matching the Person schema exactly (same name spelling, same title).
5. **Audit:** Google "Mindi Weik" monthly and note what ranks; the goal is mindiweik.com in position 1 with sitelinks.

## Phase 5: measure and iterate

- **Weekly (until indexed):** watch GSC indexed count (currently 0/96). Expect movement 2-6 weeks after phase 1/2 land.
- **Monthly:** already covered by the `/podcast-stats` digest (GSC for mindiweik.com included).
- **Bing:** submit URLs via IndexNow on publish (Bing feeds ChatGPT search). Candidate for the deploy pipeline: fire an IndexNow ping for new/changed URLs after each deploy.
- **After impressions exist:** run striking-distance and low-CTR analysis and start post-level optimization. This work is pointless before indexing happens, which is why it comes last.

## Verification

- Rich results test (search.google.com/test/rich-results) on a blog post, the homepage, and a podcast episode after phase 2.
- Schema validator (validator.schema.org) for the Person/BlogPosting/PodcastEpisode payloads.
- `curl` checks: canonical present, og:url matches, llms.txt and rss.xml render with full content.
- GSC URL inspection on 3-5 representative URLs after deploy to confirm Google sees the new markup.

## Out of scope

- Podcast discovery optimization (explicitly deprioritized)
- Paid tools, link buying, or outreach campaigns
- Performance work (site is static Astro and already fast; revisit only if CWV data says otherwise)
