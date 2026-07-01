---
title: "experiences with a local gitlab runner: part2"
description: "Ups, downs, and - 🙈 SPOILER - the rewards"
pubDate: 2024-06-11
tags: []
readingTime: 5
---

## 💡 Lessons Learned

This second part of the journey certainly had ups and downs. I gave a quick snapshot above, but there was so much time spent reading articles, documentation, and tutorials, plus ample Google searching to try to pinpoint the right methods to make everything work well together. 

**I have 3 key takeaways from this portion of the local GitLab Runner experience:**

1. Sometimes, a setback can propel your overall development.
2. Don’t forget to read beyond the surface details.
3. Keep going, even when it’s hard. The reward awaits!

### Sometimes, a setback can propel overall development.

There’s such a thing as the [sunk cost fallacy](https://thedecisionlab.com/biases/the-sunk-cost-fallacy). I’m sure you’ve heard of it. I fell into this trap, too, and didn’t want to pivot after I invested a lot of time on a solution already.

When I corrupted my Pi it actually forced me to take a step back and reconsider the problem. I had to start fresh with a new architecture and OS and this turned out to be more helpful than I initially realized.

Without being stopped in my tracks, I may have kept banging my head against the wall trying to get the unsupported architecture to work (countless hours had already been paid toward this battle). I didn’t want to give up!

But it was never going to work, honestly. Starting over gave me a new perspective that allowed me to get where I needed to be much faster than I likely would have otherwise.

### Don’t forget to read beyond the surface details.

Errors always provide clues. It’s not that you have to read between the lines, but read them carefully!

I hate to admit it, but I struggled to resolve the issues with the unsupported Pi architecture and the Mac/Linux case-sensitivity conundrum for far too long. I half-read the error messages and assumed I understood what they meant. Then I went around in circles trying to solve for things that actually weren’t even close to resolving my issues in hindsight.

Always, always, always read the messages thoroughly and don’t be afraid to Google your exact error. 

Some of the hits may not match exactly what you need for your own situation, but often I’ve found that reading others’ results can help point to the right direction of what to look into next to try to solve my particular brand of the issue.

### **Keep going, even when it’s hard. The reward awaits!**

Although this migration to the Raspberry Pi took time and effort, it’s been one of my happiest and more rewarding moments as a software engineer.

I absolutely love a challenge. The harder to unravel, the more I want to see the end result. And overall, this one was a doozy for me.

Even when I would make some progress, I would hit another wall. It was hard, but I wanted to see this conclusion so I kept pushing myself. *And, my partner helped keep my spirits up when things got hard. I appreciated that!*

**Once I finally got everything working smoothly, I celebrated that hard work**. Now, I smile a little when I hear the fan and know it’s working behind the scenes or when I submit a PR and it quickly hits the pipeline to show that satisfying green checkmark. 🥹

*We won't discuss CI/CD or setting up a GitLab Runner here. For this information, please refer to [Part 1.](/07-experiences-with-a-local-gitlab-runner-part-1)*

## Quick Recap

I wanted to set up a CI pipeline to improve the team’s development speed while working on a side project with my team. I also wanted to do simple checks to ensure we wouldn't break anything obvious when merging to main! 

Let’s find out how it went after the initial setup…

**Here, we’ll cover:**

1. 🧩 First Local Success and Challenge
2. 🥧 Move to Raspberry Pi
3. 🔄 Current Usage
4. 💡 Lessons Learned

## 🧩 First Local Success and Challenge

**Success:** If you read [Part 1](/07-experiences-with-a-local-gitlab-runner-part-1), you’ll find that I successfully learned how to set up a local GitLab Runner on my MacBook! 

The CI pipeline ran smoothly and caught a few issues before merging to main. It was doing its job. 🎉

**Challenge:** The GitLab Runner on my Mac took over my computing resources for local development.

I manually started and stopped the runner when merge requests came through. 

This was not ideal! I wanted to move the Runner to a [Raspberry Pi 4](https://www.raspberrypi.com/products/raspberry-pi-4-model-b/) I hadn’t used for anything specific yet. *(Thank you to my partner for gifting this to me early in my coding journey!)* This way, I could keep the Runner open for quicker development while freeing up my resources.

**Sure, we could have chosen other options for a Runner**, including using the GitLab built-in Runners. But I’ve wanted to find a good use for this Raspberry Pi, and I was determined to make it work!

## 🥧 Move to Raspberry Pi

The Raspberry Pi hadn’t been booted up since pre-pandemic times. It had armv7l architecture and Raspian Stretch as the OS. By this time, both were quite outdated.

After spending [way too much] time trying and failing to get the GitLab Runner installed and coordinated on the new machine, I found a [GitHub issue](https://github.com/aredridel/node-bin-gen/issues/59) that pointed to why npm and node weren’t working properly on the Pi. Bonus ✨ there was a familiar name from a Slack group for women in tech I engage with!

In my research, I soon discovered that the Pi also needed to upgrade to Raspian Bullseye, the updated Raspberry Pi OS at the time of this project. Of course, I now know that update alone wouldn’t fix the outdated architecture.

Directions in a blog were followed, and despite the clear warnings of a “dangerous” CLI command, I corrupted the Pi. Before taking the risk, I double-checked that I had nothing important to lose. 👍

**It turns out this “step back” was a great thing!** It forced me to learn to reset the Raspberry Pi through the [Operating system images](https://www.raspberrypi.com/software/operating-systems/) and start from scratch. This allowed me to update to the most updated arm64 architecture and Bullseye OS in one fell swoop.

Finally, I completed the GitLab Runner setup, connected everything, and watched the first pipeline run. I was ready to celebrate! 😅

*Of course, there was yet one more challenge to handle…*

The frontend build couldn’t pass because OSX is the [only system that ignores file case sensitivity](https://medium.com/@paulbjensen/what-mac-oss-case-insensitive-filenames-teaches-us-cd8feee7b0b3). I wasn’t aware of this until trying to get our project working alongside Linux! 

Our team develops on Mac devices, and the Raspberry Pi is a Linux/Raspian device, so of course this needed to be addressed to move forward. This is especially needed because we’re planning to deploy this project in the coming months and it will likely be on a Linux AWS instance. At least this aspect should be resolved in advance. 🤞

To combat this, I installed the [case-sensitive-paths-webpack-plugin](https://www.npmjs.com/package/case-sensitive-paths-webpack-plugin) npm package, updated our webpack config file for the front end, and worked through some file and image renaming challenges. 

We’re using TypeScript, and I also needed to add a d.ts [types file](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html) for our image files to work properly.

And THEN, it was safe to celebrate when the pipeline jobs turned green again while using the Raspberry Pi Gitlab Runner! ✅

## 🔄 Current Usage

**TL;DR: Things are running smoothly! 🙌**

The Raspberry Pi is plugged in and sits to the side of my office workspace in a position that limits fan noise. 

The Runner is always open because computing resources are now dedicated to this purpose. This means that our merge requests always go right through the CI pipeline,this happens automatically and without any thought!

After getting everything set up properly, I’ve had to move the device's location a few times. Resetting the machine or reconnecting to Wi-Fi during these changes wasn’t as much of a hinderance as I expected. It all reconnects without much issue, and it’s easy to connect a monitor and keyboard/mouse to interact as needed.

Otherwise, the Raspberry Pi is essentially left running with limited effort and power usage. We recently installed solar panels that can cover more than our household usage; I don’t feel I’m wasting energy keeping a small server running! ⚡️
