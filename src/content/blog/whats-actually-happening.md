---
title: "what's actually happening"
description: 'Part 3 of 4 in the "Unlocking Your Browser" series'
pubDate: 2026-03-12
tags: ['browser', 'devtools']
readingTime: 4
---

If you've been following along, you've poked around the DOM, styled things on the fly, and debugged with the Console like a pro. Nice work.

Now we get to the tab that makes senior engineers feel like they have superpowers.

The Network tab displays what your browser is doing behind the scenes. Every request. Every response. Every failure. It's like x-ray vision for your web app.

This is Part 3 of a 4-part series:

1. Meet Your Browser's Toolbox
2. Your New Best Friend: The Console
3. **What's Actually Happening: Network & Application (you are here! 👋)**
4. Level Up: Sources, Performance & Your Playground

Let's get into it.

## the network tab

Open DevTools and click the **Network** tab. If it looks empty, refresh the page.

Suddenly: a waterfall of requests. Every image, every script, every API call, every font should all appear, in the order it happened, with timing, status codes, and response data attached.

Here's the thing: most debugging conversations I've had that started with "my API call isn't working" ended the second someone opened the Network tab. The answer is almost always right there.

## http status codes (the ones you actually need)

Before we start breaking things on purpose, a quick cheat sheet:

- **200** - success. All good.
- **201** - created. Your POST worked.
- **204** - no content. Success, but nothing to return.
- **301 / 302** - redirect. The URL moved.
- **400** - bad request. You sent something wrong.
- **401** - unauthorized. Not logged in (or bad token).
- **403** - forbidden. Logged in, but no access.
- **404** - not found. That route/resource doesn't exist.
- **405** - method not allowed. Wrong HTTP verb.
- **422** - unprocessable entity. The data you sent was valid JSON but failed validation.
- **500** - server error. Something blew up on the backend.
- **503** - service unavailable. The server is down or overloaded.

You'll see these in the Network tab. Learning to read them is half the debugging battle.

## a working request, then some chaos

Open a new browser tab, open DevTools to the Network tab, and paste this into the Console:

```js
fetch('https://jsonplaceholder.typicode.com/posts/1')
  .then((res) => res.json())
  .then((data) => console.log(data));
```

Switch back to the Network tab. You'll see a new request appear - `1` - with a status of `200`. Click it. You can inspect the request headers, the response headers, and the actual response data.

That's a healthy request. Now let's break some stuff.

## 4 ways things go wrong (and what they look like)

### 1. bad url (failed request)

```js
fetch('https://this-url-does-not-exist-at-all.xyz/api').catch((err) => console.error(err));
```

No status code. No response. Just a red `failed` entry in the Network tab. This happens when the DNS lookup fails because the server doesn't exist. Classic typo in a base URL.

### 2. wrong endpoint, 404

```js
fetch('https://api.thecatapi.com/v1/imaaaages/search').then((res) => console.log(res.status));
```

Spot the typo? `imaaaages` instead of `images`. The server exists, but the route doesn't. You'll see a clean `404` in the Network tab. This is one of the most common bugs I've seen new devs spend 20 minutes on and it's a one-character fix.

### 3. cors issues

```js
fetch('https://www.google.com').catch((err) => console.error(err));
```

This one will fail with a CORS error. You'll see it in both the Console and the Network tab. CORS (**Cross-Origin Resource Sharing**) is the browser's way of preventing one website from making requests to another without permission. The Network tab will show the request as blocked, and the Console will tell you exactly which header is missing.

CORS errors are confusing when you first encounter them, but they always follow the same pattern. Check the Network tab, look for the blocked request, and look for the `Access-Control-Allow-Origin` header in the response.

### 4. wrong http method, 405

```js
fetch('https://jsonplaceholder.typicode.com/posts', {
  method: 'DELETE',
}).then((res) => console.log(res.status));
```

The endpoint exists, but it doesn't accept DELETE requests (or whatever method you used). The server responds with a `405 Method Not Allowed`. If you're getting a 405, double-check your HTTP verb; it's almost always a `POST` where there should be a `PUT`, or a `GET` where there should be a `PATCH`.

## the application tab

Okay, Network tab handled. Now let's talk about the **Application tab** which is less glamorous but super duper useful.

This is where your browser stores data: cookies, localStorage, sessionStorage, IndexedDB, and more. Click the Application tab in DevTools.

On the left sidebar you'll see a tree of storage options. The ones you'll use most:

- **Cookies** - small pieces of data your browser saves per domain. Often used for session tokens and user preferences.
- **Local storage** - key/value pairs that persist even after you close the browser. Commonly used for things like dark mode preferences, cached data, or "remember me" flags.
- **Session storage** - same as local storage, but cleared when you close the tab. Good for temporary state.

## viewing and editing stored data

Click **Local storage** in the sidebar, then click your domain. You'll see a table of keys and values. You can:

- **Click a value** to edit it in place
- **Right-click** to delete an entry
- **Add new entries** with the "+" button

This is incredibly useful for debugging auth or other workflows. If you're logged in and something is acting weird, check your cookies for your session token. Is it there? Is it expired? Is it malformed? The Application tab will show you.

Real-world example: you're building a theme toggle. Light mode, dark mode, whatever. You store the preference in localStorage as `theme: "dark"`. If the toggle isn't working, open the Application tab and check: is the value actually being set? Is it being read correctly? You can manually change the value and refresh to test both states without touching your code.

## your catz4life challenge 🐱

Back to the [Catz4Life Adopshun Centre](https://github.com/mindiweik/catz4life). Open the project and the Network tab at the same time. Somewhere in the app there's a broken API call. Watch the Network tab as you interact with the page and find the failed request to figure out what went wrong.

Then check the Application tab. There's a theme toggle buried in the UI. Find where it stores its state, change the value manually, and see what happens on refresh.

Hints mode is still there if you need it: `HINTS = true` in `script.js`.

## what's next

In Part 4 (the finale!), we're covering Sources, Performance, and Lighthouse plus a full guided walkthrough of the Catz4Life sandbox with all the bugs called out by tab.

But before you get there: next time an API call isn't working, open the Network tab before you change a single line of code. The answer is almost always already there.

Happy debugging. 💖

_Questions, lightbulb moments, war stories about CORS? Let me know!_

← [Part 2: Your New Best Friend: The Console](/blog/your-new-best-friend-the-console) | [Part 4: Level Up](/blog/level-up-sources-performance-and-your-playground) →
