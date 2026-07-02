---
title: "your new best friend, the console"
description: "Part 2 of 4 in the \"Unlocking Your Browser\" series"
pubDate: 2026-02-25
tags: ["browser","devtools","javascript"]
readingTime: 4
---

If you made it through [Part 1](/blog/unlocking-your-browser), you've already "hacked" Wikipedia, poked around the DOM, and maybe changed a button color or two. Good. You're getting comfortable being curious.

Now we're going deeper.

The Console tab is where things start to feel a little like magic. And also where debugging goes from "why is nothing working and I want to cry" to "...oh. OH. I see it now."

This is Part 2 of a 4-part series:

1. Meet Your Browser's Toolbox
2. **Your New Best Friend: The Console (you are here! 👋)**
3. What's Actually Happening: Network & Application
4. Level Up: Sources, Performance & Your Playground

Let's get into it.

## What even is the Console?

The Console is a live JavaScript environment running directly on whatever page you have open. You can write code, run it instantly, and see what happens without touching your actual codebase.

Think of it like a scratchpad for your browser. A place to test ideas, poke at things, and get real-time feedback on what's happening inside your page.

Here's the thing: most developers open the Console when something breaks. But some of the best developers open it before things break.

## Opening the Console

You might already have it open from Part 1. If not:

**Chrome / Edge / Brave:**
- Mac: `Cmd + Option + i` or `Cmd + Option + j`
- Windows/Linux: `F12` or `Ctrl + Shift + i`

**Firefox:**
- Mac: `Cmd + Option + i`
- Windows/Linux: `F12` or `Ctrl + Shift + i`

**Safari:**
- First, you need to enable the Developer menu: Go to **Preferences > Advanced** and check "Show Develop menu in menu bar"
- Then: `Cmd + Option + i`

You'll see a blank panel with a `>` prompt. That's your playground.

## 6 things you can do right now

These are the demos I ran during my [Parsity.io](https://parsity.io) Tech Talk. Try each one on any page you have open.

### 1. Target and change content

```js
document.querySelector('h1').textContent = 'I own this now 😈'
```

This grabs the first `h1` on the page and replaces its text. Change `'h1'` to any CSS selector: a class, an ID, a button. This is how you test content changes before touching your code.

### 2. Style on the fly

```js
document.body.style.backgroundColor = 'hotpink'
```

Instant hotpink. You're welcome. Swap in any CSS property (camelCase) and any value. This is faster than toggling between your editor and browser when you're trying to nail a style.

### 3. Log for debugging

```js
console.log('hello from the console 👋')
```

Okay, this one looks simple, and it is. But `console.log` is the most underused debugging tool I see new devs skip over. When something isn't working, log everything. Log your variables, log your API responses, log your function outputs. The Console will tell you exactly what your code is seeing, which is usually different from what you think it's seeing.

Also worth knowing: `console.warn()` and `console.error()` give you yellow and red styling respectively which is handy when you want certain logs to stand out.

### 4. Explore page context

```js
window.location
```

This returns an object with everything about the current URL like the full `href`, the `hostname`, the `pathname`, query params, and more. It's incredibly useful when debugging routing issues or building something that depends on URL structure.

Try `window.location.pathname` to get just the current path. Or `window.location.search` to see query string parameters.

### 5. Make the entire page editable

```js
document.body.contentEditable = true
```

Yes, really. 

Run this and then click anywhere on the page. You can type, delete, edit. The whole page becomes a document! Refresh to undo. This is fun for testing copy changes or doing a quick "how does this look with shorter text?" gut check.

### 6. List all images on a page

This grabs every `img` element on the page and logs its source URL. Useful for auditing what images are loading, debugging missing images, or just being nosy about where a site's assets live.

```js
document.querySelectorAll('img').forEach(img => console.log(img.src))
```

## The bigger picture

These six demos barely scratch the surface of what the Console can do. But they illustrate the core idea: **the Console lets you interact with a live page as if you wrote the code yourself.**

It's the fastest way to:

- Test a function before adding it to your codebase
- Figure out why a variable isn't what you expect
- Check what data an API is actually returning
- Prototype a small interaction without spinning up a dev environment

Next time you're debugging, try this: before you change anything in your code, open the Console and log the thing that's confusing you. Nine times out of ten, that log will tell you exactly what's wrong.

## Your Catz4Life challenge 🐱

Remember the [Catz4Life Adopshun Centre](https://github.com/mindiweik/catz4life) from [Part 1](/blog/unlocking-your-browser)? There's a broken "Adopt Me!" button that's supposed to do something when you click it...but it doesn't.

Open the project in your browser, open the Console, and see if you can figure out what's happening. 
(Hint: check for any errors that show up automatically when the page loads. The Console is already watching.)

If you want some guidance, set `HINTS = true` in `script.js` to turn on hint mode.

## What's next

In Part 3, we're going to the Network tab where you can watch every single request your browser makes in real time. API calls, failed requests, CORS errors, HTTP status codes. It's where the really juicy debugging happens.

**Until then:** open the Console on every site you visit. Run a `console.log`. Change a color. Make something editable. **Get weird with it.**

The Console doesn't bite. 💖

*Did something click for you? I'd love to hear about it!*

← [Part 1: Meet Your Browser's Toolbox](/blog/unlocking-your-browser) | [Part 3: What's Actually Happening](/blog/whats-actually-happening) →
