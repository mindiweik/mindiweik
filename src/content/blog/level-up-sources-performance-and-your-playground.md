---
title: "level up: sources, performance & your playground"
description: "Part 4 of 4 in the \"Unlocking Your Browser\" series"
pubDate: 2026-03-26
tags: ["browser","devtools","performance"]
readingTime: 5
---

You've made it to the finale. 🎉

In Parts 1-3, we covered the Elements tab, the Console, the Network tab, and the Application tab. If you've been following along and actually opening DevTools while you read, you're on top of things.

Now we're going deeper.

This is Part 4 of a 4-part series:

1. Meet Your Browser's Toolbox
2. Your New Best Friend: The Console
3. What's Actually Happening: Network & Application
4. **Level Up: Sources, Performance & Your Playground (you are here! 👋)**

Let's finish this.

## The Sources tab

The Sources tab is where debugging gets serious.

Open DevTools and click **Sources**. You'll see a file tree on the left where all the JavaScript, CSS, and HTML files your browser loaded. Click into any JavaScript file and you're looking at the actual code running in your browser.

Here's the thing: most new devs default to sprinkling `console.log` everywhere when something breaks. That works! But breakpoints are faster, more powerful, and make you look like a wizard to anyone watching.

### Setting a breakpoint

1. Open the Sources tab
2. Navigate to a JavaScript file in the file tree
3. Click the line number where you want to pause execution

That's it. A blue arrow appears on the line. Now when that line of code runs, your browser will pause, and you can inspect everything: variables, the call stack, what's in scope.

### Stepping through code

Once you're paused at a breakpoint, you have controls in the top right of the Sources panel:

- **Resume** (blue play button) - continue running until the next breakpoint
- **Step over** - run the current line and pause at the next one (don't go inside function calls)
- **Step into** - go inside the function call on the current line
- **Step out** - finish the current function and pause when you return

This is how senior engineers debug. They don't guess. They pause, look around, and step through the code line by line until they find exactly where things go wrong.

### Conditional breakpoints

Right-click a line number and choose **Add conditional breakpoint**. You can type an expression like `count > 5` and the browser will only pause when that condition is true. Incredibly useful for loops where the bug only shows up on a specific iteration.

## The Performance tab

The Performance tab answers a question you'll hear a lot as you grow: *why is this so slow?* I don't see many devs using this tool and I don't use it as often as I probably could. 😅

Open DevTools and click **Performance**. You'll see a big empty space and a record button.

### Recording a performance profile

1. Click the **record button** (or press `Cmd + E` on Mac, `Ctrl + E` on Windows)
2. Interact with your page - scroll, click, load something
3. Click **stop**

Now you'll see a timeline. It looks intimidating at first, but here's what to focus on:

**The flame chart** is the call stack over time. Tall stacks mean a lot of functions calling each other. Long horizontal bars mean a function ran for a long time. Long bars are your bottlenecks.

**The summary panel** at the bottom shows a breakdown of where time was spent: Scripting, Rendering, Painting, etc. If Scripting eats most of your time, your JavaScript is the culprit. If Rendering is high, your layout or CSS might be thrashing.

### What to look for

- **Long tasks** - anything over 50ms is flagged in red. These are the tasks that make your UI feel crummy.
- **Layout thrashing** - repeatedly reading and writing to the DOM forces the browser to recalculate layout over and over. It shows up as alternating purple (layout) and green (paint) blocks.
- **Unnecessary re-renders** - in frameworks like React, this is a common culprit. The Performance tab will show you exactly where time is being spent.

You don't need to master the Performance tab. But knowing it exists and how to open a recording means that when someone says "this page feels slow," you have a tool to actually find out why.

## The Lighthouse tab

Lighthouse is an automated auditing tool built right into DevTools. It's one of the most useful things to run on any project you care about.

Click **Lighthouse** in the DevTools tabs. You'll see options to audit for:

- **Performance** - how fast does your page load?
- **Accessibility** - can everyone use your site?
- **Best practices** - are you following web security and quality standards?
- **SEO** - is your page set up to be found by search engines?

Check the categories you want and click **Analyze page load**.

After a minute or so, you'll get a scored report (0-100 for each category) with specific, actionable recommendations. Things like:

- "Images are not sized correctly" (with exact file names)
- "Links do not have a discernible name" (accessibility)
- "Page lacks a meta description" (SEO)
- "Render-blocking resources" (performance)

Each finding links to documentation explaining why it matters and how to fix it. It's like a free code review from a robot.

Run Lighthouse on your side projects. You'll learn a lot about what "production-ready" actually means.

## The full Catz4Life sandbox walkthrough

If you've been following this series, you've had access to the [Catz4Life Adopshun Centre](https://github.com/mindiweik/catz4life) sandbox since Part 1. Now let's pull it all together.

Here's a quick guide to get started if you haven't yet:

1. Fork or clone the repo: `git clone https://github.com/mindiweik/catz4life`
2. Open `index.html` directly in your browser (no server needed)
3. Open DevTools and start exploring

Hints mode is available if you want a nudge: set `HINTS = true` in `script.js`.

### What's broken and where to find it

**Elements tab**

There's a typo in the page heading. Inspect the DOM and find it.

One of the cat cards has a CSS issue making it look ugly. Use the Styles panel to find and fix it.

**Console tab**

The "Adopt Me!" button on one card throws an error when clicked. Open the Console, click the button, and read the error message. The fix is one line.

**Network tab**

One of the cat images fails to load. Watch the Network tab as the page loads and find the failed request. Check the URL for a typo.

**Application tab**

There's a theme toggle in the UI. Find where it stores its state in localStorage. Try changing the value manually and refreshing.

**Sources tab**

Set a breakpoint on the button click handler and step through the code. Where does it go wrong?

**Lighthouse**

Run a Lighthouse audit on the page. What's the accessibility score? There are at least two issues to find.

## Your browser is a workbench

Here's the thing about DevTools: it's not a tab you open when something breaks. It's a workbench you keep open while you build.

The engineers who get fast aren't the ones who know the most syntax. They're the ones who can look at a broken thing and immediately know which tool to reach for. Network tab for API issues. Console for JavaScript errors. Sources for stepping through logic. Lighthouse for quality checks.

That instinct takes practice. But the fact that you've read all four parts of this series means you know the tools exist and roughly what they do. That's the hardest part!

Now go break something on purpose.

## Your final Catz4Life challenge 🐱

Fork the repo. Open DevTools. Fix every bug.

Then, once you've fixed them, break something intentionally and see if you can use DevTools to catch what you broke. That's the real exercise: learning to trust your tools.

Happy debugging. 💖

---

*Thanks for reading the whole series! Questions, lightbulb moments, or things I missed? Drop a comment or find me on LinkedIn.*

*← [Part 3: What's Actually Happening: Network & Application](/blog/whats-actually-happening)*
