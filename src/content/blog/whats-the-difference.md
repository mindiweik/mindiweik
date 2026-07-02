---
title: "what's the difference?!"
description: "Transpiler | Compiler | Runtime"
pubDate: 2025-05-13
tags: ["fundamentals"]
readingTime: 3
---

After trying to get 3 “big” software engineering words to stick, I wrote a similar post: 

#### [3 Big, Scary Software Engineering Words Explained](/blog/3-big-scary-software-engineering-words-explained)

My brain often mixes up transpiling and compiling. As I picked up TypeScript, I wasn't always clear on how they affected runtime. I needed to get them straightened out!

What is the best way to solidify that information? Research, write it down, and share it! Maybe my interpretation will help you get more clarity, too.

I previously wrote about two of the items we’re going to talk about today, from the perspective of TypeScript, specifically:

- [Exploring TypeScript: TS Compiler](/blog/exploring-typescript-ts-compiler)
- [Exploring TypeScript: Runtime](/blog/exploring-typescript-runtime)

But today, let’s cover these three topics - transpiler, compiler, and runtime - more broadly. Shall we?

**Here, we’ll cover:**

1. 📖 Compiling
2. 🧑🏽‍🍳 Transpiling
3. 🔥 Runtime

*Warning, you may get hungry reading this. I was hungry when I wrote it. Ready?*

<!-- MIGRATION TODO: original shows an image here (intro graphic): https://substack-post-media.s3.amazonaws.com/public/images/d7b41dce-f0eb-4279-8c27-a5c2bbc80e10_940x788.png -->

I was trying to think of a good way to describe and/or remember the differences. I love analogies. And I love to eat. So, let’s talk food.

Hear me out! 🤣

Let’s pretend we’re making something warm. I’m in the mood for some ramen.

We have a recipe in front of us (our code) 📖 that we want to combine and turn it into a delicious bowl of soup (something that will work in a browser or on a computer). 🍜

## 📖 Compiling

*First, let’s change the recipe from one language to a completely different language.*

So, our recipe is currently written in Japanese (TypeScript), but we need it to be in English (JavaScript) so that other people who don’t understand Japanese can read it and enjoy this delicious ramen recipe, too.

**Compiling is essentially translating code from one language to another!**

*This could also look like translating C or Rust to machine code.*

## 🧑🏽‍🍳 Transpiling

*Okay, great! But, now we want to rewrite it to make it simpler English.*

Maybe we used words that are too fancy or went into way too much detail about some steps. We care a lot about this ramen!

Maybe someone new to cooking wants to make some, too! But, they want a simpler version. Pretty please?

Let’s rewrite the recipe from those detailed, fancy words (modern JavaScript after we compiled our TypeScript) and reduce that to more basic instructions (older JavaScript). We’re still using English this time, but making it simpler.

**Transpiling transforms code into a simpler version of the same language; it’s easier to understand.**

*This can also look like a transformation of JSX files to JavaScript or Sass to CSS.*

## 🔥 Runtime

*Finally, let’s actually use this recipe we’ve worked so hard on! We’ll cook the ramen!*

Our computer is following the recipe we’ve made and generating our ramen!

Actually, it’s running your code, but if you had a project that took a ramen recipe input to make an image or something of ramen (in the browser or Node with our JavaScript example), then you will have made ramen in a sense! 🤔

However, it’s important to remember that if something goes wrong (like missing ingredients because they were out at the store or steps out of order because we thought we already did the step before), we may find ourselves in a runtime error. We should handle those!

**Runtime is when a computer is running the code we wrote.**

*This can also look like Python running in the Python interpreter or Java running on the JVM (Java Virtual Machine).*

**🍜 Yay! We finally made it!**

I hope that these breakdowns are helpful.

Are any other terms, concepts, or phrases tripping you up or wasting your precious time Googling/asking AI again because they’re not sticking? Let me know!
