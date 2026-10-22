---
title: 'blocked: a survival guide'
event: The Tech Academy · Tech Talk
date: 2026-10-23
location: Online
type: workshop
description: An interactive debugging workshop about what to do when you are stuck, built on a deliberately unfinished lost-pet registry app.
links:
  - label: Try the app
    url: /lab/blocked/
---

Talk 3 of The Tech Academy's series, and the one where the subject is not a tool but a habit: what you actually do in the moment you are stuck.

Most advice about getting unstuck is about looking harder. Last time we went deep on the browser DevTools, which answers _where to look_. This one is about what to do when looking has not worked, and the reason you are stuck is that you are waiting on something. Usually a person.

The workshop runs on a small, deliberately unfinished app: a community lost-pet registry called **Homeward**. It is messier than it looks. The page loads, the records are all there, but six of the seven have no photo. One thing is broken in a way that says nothing at all. And one thing cannot be fixed, because the app is missing a credential that only I have. That last part is the point.

The two moves we practice:

- **Ask what you can do right now.** Not "how do I solve this," which is a wall, but "what is available to me in the next ten minutes," which is a menu.
- **Build around the gap and shrink the ask.** When what is missing belongs to someone else, stub out the hole, keep building the parts that do not need it, and turn "can you help me" into one precise question that is easy to answer.

We start with the ask, not with the bugs. The delegation request goes out in the first few minutes, and while it sits in someone else's inbox we work on everything else. The wait is not dead air. It is the assignment.

## Try it

**[Open the app](/lab/blocked/)** in a new tab. It loads in the state students see: working, but not finished.

## If you want to fix it yourself

The hosted page is for looking. To change the code you need the files on your machine, because the loop is edit the file, save, refresh the browser.

1. **[Download the app](/files/homeward.zip)** (one zip, six files).
2. Unzip it.
3. Open `index.html` in your browser.
4. Edit `script.js` in any text editor, save, refresh.

The zip also works with no server and no internet for the fonts, so it is fine to hand out on a USB stick at a workshop.

The **Sources** tab in DevTools is for looking, not editing. Set breakpoints, inspect values, read the code as the browser sees it. Edits typed directly into Sources vanish the moment you reload.
