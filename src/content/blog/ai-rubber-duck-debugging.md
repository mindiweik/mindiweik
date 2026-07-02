---
title: "ai is rubber duck debugging, but the duck talks back"
description: "rubber duck debugging works. it works even better when the duck answers."
pubDate: 2026-07-02
tags: ["ai", "learning", "debugging"]
draft: true
---

You know rubber duck debugging, right?

The idea is simple: when you're stuck on a problem, explain it out loud to a rubber duck sitting on your desk. The act of articulating the problem, step by step, out loud, forces your brain to organize the chaos. And somewhere in that explanation, you usually find the answer yourself.

It works. Sometimes embarrassingly well.

Lately I've been doing something even better. Same concept, but the duck talks back.

## The setup

I'm a founding engineer at a startup. We're small, moving fast, and I often find myself deep in territory I haven't been in before. CD pipelines. Docker buildx. GitLab CI. Infrastructure stuff that I'm interested in, but isn't my daily bread.

I could Google my way through it. I could read docs. I could post on Stack Overflow and wait three days for someone to tell me my question is a duplicate.

Or I could just... talk through it. With AI.

And I mean *actually* talk through it, not "write me a CI pipeline," but "here's what I'm trying to do, here's what's happening, here's what I've already tried, what am I missing?"

There's a definitive difference.

## What makes it actually work

The magic isn't AI itself. The magic is **the process of explaining the problem.**

When you're forced to write up what's happening like what you expected, what actually occurred, or what you've tried, something clicks. You start to understand the shape of the problem better just by describing it. Often I figure out the next thing to try *while writing the message.*

It's the rubber duck effect. Except when you're done explaining, the duck goes "oh interesting, that error usually means X. Have you checked Y?" and suddenly you're actually learning *why* X causes that behavior, not just copying a fix from Stack Overflow.

## A real example

Recently I spent a few hours debugging a CD pipeline for that startup project I work on. Here's a taste of what we went through:

- GitLab pipelines not triggering on tags (protected variable scoping, who knew!)
- Docker login failing in CI with a TTY error
- DNS resolution dying inside buildkit containers
- QEMU emulation dropping network connections during `npm ci`
- A multi-stage Dockerfile optimization to eliminate the network calls entirely

Each one of those could have been a rabbit hole I fell into alone, probably getting frustrated and copy-pasting fixes I didn't understand.

Instead, each time something broke, I pasted the error and explained what I was seeing. We troubleshot it together. I asked "why does this happen?" and got actual explanations, not just "run this command." By the end, I understood QEMU emulation, Docker credential stores, and buildkit networking in a way I genuinely wouldn't have if I'd just followed a tutorial.

## The writing-up-the-problem part is a skill

This is maybe the most underrated part.

Learning to clearly describe a technical problem is a superpower. It forces you to:

1. **Know what you actually tried** (not just "it didn't work")
2. **Separate what you expected from what happened**
3. **Identify what you don't know** (which is where the learning lives)

When you can do this well, you become better at asking for help from humans too. Your Slack messages are clearer. Your GitHub issues are more useful. Your standups are tighter.

And weirdly, sometimes you don't even need the answer. You just needed to write it out.

## It's not cheating. It's learning out loud.

I think there's still some guilt in the developer community around using AI. Like you're supposed to suffer through the docs alone as some kind of rite of passage.

But you're not outsourcing the thinking. You're thinking out loud with a patient, knowledgeable collaborator who doesn't judge you for not knowing what QEMU is.

The learning happens in the conversation. In the follow-up questions. In the "wait, why does that work?" moments.

The rubber duck was always a tool for thinking. This is just a rubber duck that thinks back.

*If you've been using AI as a learning tool (or avoiding it out of guilt), I'd love to hear about it. Find me on LinkedIn.* 💙
