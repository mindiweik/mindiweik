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
