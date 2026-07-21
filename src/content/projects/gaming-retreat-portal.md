---
name: Gaming Retreat Portal
blurb: A portal for running a multi-day tabletop gaming retreat, ranked-choice lottery and all.
status: wip
stack: [TypeScript, Next.js, PostgreSQL, Drizzle]
order: 3
since: 2026
lastUpdated: 2026-07-20
repoUrl: https://github.com/mindiweik/gaming-retreat-portal
---

Gaming Retreat Portal is a web app for running a multi-day tabletop gaming retreat: profiles, a game catalog, a per-day ranked-choice lottery, self-service signups for attendee-run games, tiered waitlists, and a calendar-first view of the whole weekend. It scales comfortably to around 150 people.

## the story

Another scratch-your-own-itch build, except this itch is a retreat full of friends and a scheduling problem that spreadsheets kept losing to. A bunch of people, a few days, way more games than seats, and everyone wanting to get into the ones they care about most.

The north star is fairness. Everyone should get at least one game per day, the eager folks can stack more, and nobody should feel like the schedule was decided in a back room. So the whole thing is built around a lottery that is transparent and reproducible, and a calendar you can actually look at instead of a list you have to decode.

## how it's built

Next.js and TypeScript end to end, PostgreSQL with Drizzle underneath, Discord OAuth for login because the group already lives in Discord. A global phase state machine keeps operations from happening out of order, so nobody can edit their rankings after lock or run the lottery twice.

The heart of it is a pure, fully tested lottery module: no database, no I/O, just a deterministic per-day function with a stored seed so any run can be reproduced or re-run with a fresh shuffle. Three passes handle the one-per-day guarantee, a second game for people who want it, and a table-health rescue for under-filled games, then everything unlanded rolls into waitlists automatically.

## where it's at

Scaffold plus infrastructure in progress, with the lottery module already built and tested against a 150-attendee simulation. Targeting the retreat in June 2027, which means a lot of focused weekend work between now and then.
