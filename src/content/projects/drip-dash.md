---
name: Drip Dash
blurb: A dashboard for Gardyn hydroponic systems.
status: wip
stack: [TypeScript, React, Express, SQLite]
order: 2
since: 2025
repoUrl: https://github.com/mindiweik/drip-dash
---

Drip Dash is a dashboard for Gardyn hydroponic systems. I have two of them growing things in my house at all times, and the official app never quite showed me what I actually wanted to know.

## the story

Classic scratch-your-own-itch project. I wanted one screen that answered "how are the plants doing", so I started building it.

## how it's built

TypeScript and React on the front, Express and SQLite behind it. A data-source adapter keeps the dashboard honest about where readings come from: today a realistic mock, eventually the Gardyns themselves.

## where it's at

Revived (July 2026). Turns out saying "dormant" publicly was half the motivation strategy, because it worked. The revamp is spec'd and planned: a kiosk dashboard plus a break-time chore board first, then real sensor data, then an AI layer that can look at plant photos and tell me what needs doing.
