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

The site you are reading right now. My blog, the [WIP] podcast archive, speaking history, and these project pages, all under one roof after years of living on separate platforms.

## the story

This started as "I should move off the website builder" and turned into a full migration: the wip-podcast.com site folded in with 301s, Substack posts imported, and everything rebuilt as a static site I actually own. I wrote about the why in [why i rebuilt my site](/blog/why-i-rebuilt-my-site).

## how it's built

Astro with content collections, deployed to Hostinger over FTP by GitHub Actions on every push. A daily rebuild releases scheduled posts, and the 404 page does fuzzy "did you mean" suggestions. The repo is public if you want to poke around.

## where it's at

Live and evolving. The changelog on the home page is the honest record.
