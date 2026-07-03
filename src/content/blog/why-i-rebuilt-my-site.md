---
title: why I rebuilt my whole site from scratch
description: Tearing down the old site, keeping the version numbers.
pubDate: 2026-07-03
tags: [astro, meta]
---

I finally tore down the old site. Not because it was broken. Because I wanted to build it from scratch.

Why the heck would you rebuild a site that already works?

Fair.

## the old site was a rental, not a home

For a while my whole online presence lived at Substack and later [wip-podcast.com](https://www.wip-podcast.com/), built on a website builder that did exactly what website builders do. It got me online fast, it looked fine, and it quietly boxed me in the second I wanted anything specific. And I kept wanting things specific.

A few things nagged at me for months:

1. **It was named after one project.** wip-podcast.com is a great name for a podcast and a weird name for a person who also writes, speaks, and ships side projects. My work doesn't live in one box, so my site shouldn't either.
2. **I didn't own the layer that mattered.** I owned the content, sure. But the structure, the components, the way things connected? That belonged to the builder. Every customization was a fight against defaults.
3. **I think in release notes, versions, and commits.** I wanted my homepage to literally be a changelog of everything I ship: posts, episodes, talks, projects, all in one feed. Try doing that in a drag-and-drop builder. I dare you.
4. **Can I just say "components?"** I don't like building the same thing over and over!

There's a difference between renting a space and owning one. The rental is faster to move into. But you can't knock down a wall.

## what I actually wanted

Once I let myself imagine starting over, the wishlist got clear fast. One place, under my own name, that could hold all of it: the [WIP] Podcast, my blog, the talks, and the things I build. Not four scattered links. One home with four rooms.

And I wanted the site itself to feel like it was made by an engineer, because it is.

So [mindiweik.com](https://mindiweik.com/) became the plan. Freshly built alongside AI. Mine end to end.

## the design idea I'm most excited about: colorful wayfinding

Most personal sites pick one accent color and sprinkle it everywhere. Pretty, but the color isn't doing any work.

I wanted color to mean something. So each zone of the site gets its own identity:

- Blog is blue (it's also the home base)
- Podcast is pink (not for alliteration, pink was the theme beforehand)
- Speaking is green
- Projects are amber

Land on a pink page and you know you're in podcast-land before you've read a word. The color is navigation, not decoration. It's the kind of small systems-thinking detail that hardly anyone consciously notices and everybody feels.

## building it the boring, durable way

I rebuilt on [Astro](https://astro.build/) as a static site. In plain terms: it's fast, it ships almost no JavaScript, and there's no platform between me and my own pages. Publishing a post is a git push. A GitHub Action builds the site and deploys it while I go pour my tea.

Every stack decision came down to one question: will I still understand and control this in two years? Role-named design tokens instead of hardcoded colors. Components that each do exactly one job. A single file that maps each zone to its color and route, so adding a new section is one line, not a scavenger hunt.

It is, on purpose, a little boring. Boring is what survives.

## the part I didn't expect

I expected the rebuild to be a chore with a nice reward at the end. What I didn't expect was what the migration itself would do to me.

Moving three years of content means rereading three years of your own writing. Posts from right out of bootcamp. Posts from the first engineering job. Episode notes from conversations long past. It turned into an accidental retrospective, and I came out the other side weirdly proud of the person who wrote all of that while figuring everything out in public.

The other surprise: owning the site changed my relationship with ideas. On the builder, "it would be cool if..." went to a wishlist and died there. Now? I wanted drafts I could preview locally without publishing, and scheduled posts that go live at 6am while I am running outside with my doggo. I built both in an afternoon. The distance between wanting a thing and shipping a thing collapsed, and that momentum spills into everything else I make.

## was it worth it?

Rebuilding from scratch is almost never the efficient choice. If you just want to be online, don't do this. Use the builder, ship the thing, go live your life.

But if the site is going to represent you for the foreseeable future, and the tools keep telling you no, sometimes the fastest path forward is to start over on a foundation you actually own.

**So: what's the thing you keep meaning to rebuild from scratch? I'd genuinely love to hear about it. 💙**
