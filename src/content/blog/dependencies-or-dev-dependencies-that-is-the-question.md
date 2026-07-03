---
title: "dependencies or dev dependencies, that is the question"
description: "Understanding basic package management"
pubDate: 2024-11-14
tags: ["javascript","fundamentals"]
readingTime: 6
---

I, a human coder, made a silly mistake. There was a time when I moved a package in our project’s package.json file from the dependencies section to the devDependencies section because it made sense to me then. How wrong I was!

Thankfully, it didn’t have a huge impact; it was for a developer tool and a new-to-us package. The issue resulting from the change was caught quickly. We rectified it with ease, and we all lived happily ever after.

However, I know I’m not the only one to fall into this trap. I thought it would be good to caution my former self and others who may not yet know the differences between a dependency and a dev dependency.

**Here, we’ll cover:**

1. 📂 Package & Module Definitions
2. 💎 What is a Dependency?
3. 🧑🏾‍💻 What is a Dev Dependency?

**I’ll share some examples and my story. We’ll keep it simple.** 😉

## 📂 package & module definitions

Let’s quickly define a “package” and a “module” in software development to ensure a common understanding. 

A **package** is a file, directory, or resource set that can be publicly or privately shared. These packages can provide useful functions or tools for your project and are defined within a package.json file.

That package.json file is important! It holds all the details about your project, like authors, licensing, and scripts. It also houses your list of dependencies and devDependencies and the specific version numbers your project needs to work as intended.

One of the most common software registries for packages is **[npm](https://docs.npmjs.com/about-npm)**. I’m sure you’ve interacted with it at some point! My teams work a lot in Node, and npm also helps share and use **Node modules** similarly, loading something directly *from* a JavaScript or package.json file for use in your project. 

In any case, npm uses your package.json file to determine which packages or modules you will need for your project. Remember that you will list a version number that npm will use to install the corresponding package. Take an extra moment to consider this for your project; failing to do so could result in feature compatibility issues, bugs, and instability.

Packages allow individuals, organizations, and companies to take advantage of existing solutions, saving time and resources. They also typically provide documentation to help users apply these solutions to their project needs. Keep in mind that the quality of documentation can vary greatly!

But using packages and modules is not all 🌈 rainbows and unicorns 🦄. 

When you add tooling like this, it needs ongoing maintenance - someone has to update it, fix bugs, and improve the documentation.

Hidden security risks can also exist, especially if the creator(s) no longer maintain it. 

## 💎 what is a dependency?

Dependencies are ultimately any package used in your project. Dependencies should be added to your package.json file's dependencies object to help your project function properly when deployed. 

You might use these packages for development and testing, or they might be tools, libraries, frameworks, or other packages that improve an end user’s experience.

The key thing to note is that these packages should be **needed to run in production**.

Here are a few packages we regularly use for Node API projects:

```js
"dependencies": {
  "express": "^4.21.1",
  "pino": "^9.5.0",
  "zod": "^3.23.8"
}
```

Consider these packages and why they ended up in the dependencies list.

If you’re unfamiliar with these packages, here’s the gist: [Express](https://expressjs.com/) is a Node framework commonly used to create a project server. [Pino](https://getpino.io/) is a fast and lightweight logging library. [Zod](https://zod.dev/) is a schema validation library we use to ensure that our “outside data” conforms to the TypeScript types we utilize in our codebase.

Now let’s take a closer look at ***why*** each of these packages belongs in the dependencies section of the project.

Express is a bit obvious. How would an end user send over an API request without a server to connect with? We need a server on the production deployment for our users to reach our API. Easy enough!

What about Pino? As a logging library, we use this to send logs to our deployment cluster for local logs and to the observability platform to view all of our logs in one place. Yes, we need and use logs during development to ensure things are working as expected or failing as expected in some cases. However, arguably more importantly, we need our logs in our production deployment to tell what’s going wrong and why in the case of unexpected issues.

And Zod? Especially because we use TypeScript in my team projects, a more strictly typed language than vanilla JavaScript, we need to ensure the data we receive “from the outside world” is what we expect. Regardless of language, a validation library lets us immediately stop invalid types in their tracks, keeping our app safer! As you might imagine from my earlier quote, “from the outside world,” we expect these schema validations to be used in the production deployment. How else would we check that users are sending us what we expect?

Hopefully these examples provide a bit more context. To reiterate, when we need to use a package in the production deployment or if a tool is needed to interact with or validate user input, this is usually an indicator that your package needs to be located in the dependencies list.

## 🧑🏾‍💻 what is a dev dependency?

Now that we’ve established what a dependency is, let’s look at the other side of the equation - devDependencies. The devDependencies packages are specifically used for **local development and testing**. 

In other words, if there is a package or module you only need to use during development, and your app doesn’t need it when deployed into the wild, that package should be added under the devDependencies object in your package.json file.

Here are a few packages we regularly use for Node API projects, along with the “oops” package, which we’ll talk about toward the end:

```js
"devDependencies": {
  "@bugsnag/js": "^8.1.2", // my offending "oops"
  "c8": "^10.1.2",
  "eslint": "^9.14.0",
  "typescript": "^5.6.3"
}
```

**Let’s start with the packages that belong here.**

If you’re unfamiliar with these packages, here is the gist: [C8](https://github.com/bcoe/c8) is a tool we use to check our test coverage natively in Node. [Eslint](https://eslint.org/) is a popular linting utility tool to ensure your project follows the standards you put into place in your config file. This will typically follow your team or organization’s determined linting rules. [TypeScript](https://www.typescriptlang.org/), which I’ve already mentioned, is a language that happens to be a superset (or added features on top of) of JavaScript.

C8 is purely for our internal purposes. Tests are frequently run locally, in development environments (where the app is actively being worked on), in staging deployments (which simulate the production environment), and in CI/CD pipelines. Tests in a production deployment serve no purpose and could negatively impact performance, especially as a project scales. Ultimately, C8 is for dev eyes only! 👀

Similarly, eslint is not something our users should know about. They won’t be looking at our codebase, and it’s unlikely that users would know enough about code - or our particular codebase or domain - to nitpick on our cohesive linting. Unless you’re working on an open-source project. But that’s a different story.

What about TypeScript? One could argue that you would need *some* level of language available to actually run the code, right? [TypeScript doesn’t exist at runtime](/blog/exploring-typescript-runtime)! Runtime code is essentially the executed code your users interact with. JavaScript files are created in the project's “build” or compile step, and Node can execute these files, so TypeScript is unnecessary in the dependencies section. Where TypeScript shines is its ability to write type-safe JavaScript code *before* it is [compiled](/blog/exploring-typescript-ts-compiler).

**Let’s talk about the 'oops' moment when I mistakenly moved a package that should’ve been in `dependencies` to `devDependencies`.**

My error came when I moved two [BugSnag](https://www.bugsnag.com/) packages, like “@bugsnag/js” listed above, to the devDependencies section. We implemented BugSnag into a new project as a tool to monitor errors and track them down to squash them quickly! At first, it seemed like BugSnag should only be needed in devDependencies because it was a ***developer tool***. Our users would not be interacting with it.

You may already see why that is an issue, but this made perfect sense in my initial mental model. When this change was deployed into our production code, we noticed an issue immediately. 

**We used BugSnag references in our handlers and application-level code that relied on this package and our production deployment couldn’t compile and build!**

I’m grateful that the issue was quickly noticed and easy to fix. The team immediately reverted this to the dependencies section, and all was well. We implemented BugSnag to monitor errors and track them in real-time in the production environment, which is why it needed to be listed in dependencies. Without it in production, we couldn't run the app, nor reach the goal to catch and fix issues promptly.

Although dev tools are *often* only needed in the devDependencies section, consider whether it is actually used in production. In our case, BugSnag needed to be available in production because how else would we find and catch those bugs?

Of course, that makes sense. They say hindsight is 20/20.

**I hope this cautionary tale is helpful for those who have just learned about** dependencies **and** devDependencies **or a good reminder for those who already know. Take an extra moment to think about your packages and where they belong!**

## 🤓 continued reading:

If you want more details, I used these sources to help me refine my thoughts and phrasing!

- [npm - About Packages and Modules](https://docs.npmjs.com/about-packages-and-modules)
- [npm - Specifying dependencies and devDependencies in a package.json file](https://docs.npmjs.com/specifying-dependencies-and-devdependencies-in-a-package-json-file)
- [DhiWise - Mastering Package Management: DevDependencies vs. Dependencies](https://www.dhiwise.com/post/package-management-devdependencies-vs-dependencies)
  - A great, in-depth article. **BONUS**: They also discuss peerDependencies!
- [Stack Overflow - An old, but incredibly helpful question and answer](https://stackoverflow.com/questions/18875674/whats-the-difference-between-dependencies-devdependencies-and-peerdependencie#:~:text=Summary%20of%20important%20behavior%20differences%3A)
  - **BONUS**: peerDependencies mentioned here
- [Geeks for Geeks - Difference between dependencies, devDependencies and peerDependencies](https://www.geeksforgeeks.org/difference-between-dependencies-devdependencies-and-peerdependencies/)
  - **BONUS**: peerDependencies mentioned + a useful table!
