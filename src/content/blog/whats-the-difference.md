---
title: "what's the difference?!"
description: "Transpiler | Compiler | Runtime"
pubDate: 2025-05-13
tags: []
readingTime: 3
---

After trying to get 3 “big” software engineering words to stick, I wrote a similar post: 

#### [3 Big, Scary Software Engineering Words Explained](/12-3-big-scary-software-engineering-words-explained)

My brain often mixes up transpiling and compiling. As I picked up TypeScript, I wasn't always clear on how they affected runtime. I needed to get them straightened out!

What is the best way to solidify that information? Research, write it down, and share it! Maybe my interpretation will help you get more clarity, too.

I previously wrote about two of the items we’re going to talk about today, from the perspective of TypeScript, specifically:

#### [Exploring TypeScript: TS Compiler](/13-exploring-typescript-ts-compiler)

#### [Exploring TypeScript: Runtime](/14-exploring-typescript-runtime)

But today, let’s cover these three topics - transpiler, compiler, and runtime - more broadly. Shall we?

**Here, we’ll cover:**

1. 📖 Compiling
2. 🧑🏽‍🍳 Transpiling
3. 🔥 Runtime

*Warning, you may get hungry reading this. I was hungry when I wrote it. Ready?*

I was trying to think of a good way to describe and/or remember the differences. I love analogies. And I love to eat. So, let’s talk food.

Hear me out! 🤣

Let’s pretend we’re making something warm. I’m in the mood for some ramen.

We have a recipe in front of us (our code) 📖 that we want to combine and turn it into a delicious bowl of soup (something that will work in a browser or on a computer). 🍜

## 📖 Compiling

*First, let’s change the recipe from one language to a completely different language.*

So, our recipe is currently written in Japanese (TypeScript), but we need it to be in English (JavaScript) so that other people who don’t understand Japanese can read it and enjoy this delicious ramen recipe, too.

**Compiling is essentially translating code from one language to another!**

*This could also look like translating C or Rust to machine code.*
