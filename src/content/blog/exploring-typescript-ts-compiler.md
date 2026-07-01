---
title: "exploring typescript: ts compiler"
description: "What is it? How can we best leverage the compiler?"
pubDate: 2024-07-16
tags: ["typescript"]
readingTime: 4
---

This is part of a semi-monthly series that will put TypeScript under a microscope to become more adept overall. 🔬

Understanding the nitty gritty bits and pieces of a language can only benefit us as software builders!

This post will cover the **TypeScript Compiler**.

1. 🤔 What is tsc (TypeScript Compiler)?
2. 🦾 How to best leverage the compiler as a tool
3. 📚 Resources for further reading
**Let's dive in!**

## 🤔 What is tsc (TypeScript Compiler)?

TypeScript is free and [open-source](https://github.com/microsoft/TypeScript). Microsoft originally developed and released it in 2012. This language is often best used in larger or more complicated projects.

If you’re unaware, TypeScript is a superset of JavaScript that adds static typing to JavaScript syntax and functionality. This offers a level of type safety to help developers reduce mistakes, and, in my opinion, it broadens the context of the codebase, making it more readable for teammates and your future self!

*So, what the heck is a compiler?*

## 🦾 How to best leverage tsc as a tool

### **Okay, I think I get it, so how do I use it? 🛠️**

Well, to start, you need to ensure you [install TypeScript](https://www.typescriptlang.org/download). You can do this globally:

### **Thanks so much for reading!** ✨

Subscribe to receive occassional blog posts!
Your contact information will never be sold.

```js
npm install -g typescript
```

For a specific project, navigate to your project folder in the terminal or your favorite IDE:

```js
npm install typescript --save-dev
```

Then, you can run the TypeScript compile command in the terminal:

```js
tsc file-name.ts
```

The above command will perform the compilation step of the TypeScript file and output a compiled JavaScript file with a similar name and a .js file extension: ****

Overall, it’s pretty simple to use, and I use it often in my package.json scripts!  If you want to get a little “fancy,” you can also make use of the many tsc [CLI options](https://www.typescriptlang.org/docs/handbook/compiler-options.html) in your scripts or directly in the terminal.

### **`tsc` is installed, and I can generate JavaScript files! But how can I have more control over the TypeScript Compiler? ⚙️**

The best way to manage your compiler output (as well as other TypeScript usage details) is through the tsconfig.json file. You can set up the TS project and this special file using the [command](https://www.typescriptlang.org/docs/handbook/compiler-options.html#:~:text=Initializes%20a%20TypeScript%20project%20and%20creates%20a%20tsconfig.json%20file.):

> "In computing, a compiler is a computer program that translates computer code written in one programming language (the source language) into another language (the target language)."
>
> [Wikipedia](https://en.wikipedia.org/wiki/Compiler#:~:text=In%20computing%2C%20a%20compiler%20is%20a%20computer%20program%20that%20translates%20computer%20code%20written%20in%20one%20programming%20language%20(the%20source%20language)%20into%20another%20language%20(the%20target%20language).)

In our case, TypeScript is being compiled into the higher-level language of JavaScript to be understood and used by browsers or a Node environment. Once that’s completed, the JavaScript version of your project can then be deployed.

```js
tsc --init
```

This file is - you probably guessed it - a JSON file stored in the root level of a TS project. Here, you can determine specific runtime mechanic choices for your unique project using the various [options](https://www.typescriptlang.org/tsconfig/) available.

You can set up your project details, such as whether or not you want “strict” checks, what JavaScript features you want supported in the compiled version, and which project files to include or exclude.

There are so many configurations you can use! In fact, each of the various TS projects I’ve worked on has a uniquely different tsconfig file based on the needs of the team and the project.

### **Anything else I should know? ⛓️**

You’re not limited to one single tsconfig file!

Perhaps your overall project needs unique frontend and backend settings. Similarly, if your project supports browsers and Node a bit separately, you might want to create different compiler output files for better support in each environment. Or, if you want to create a debugger setup that maps the files (see example below) but don’t want this to happen for your typical build, it could be a good idea to have a separate tsconfig for this process.

I could keep brainstorming, but I think you get the point.

*So, how does one extend a *tsconfig* file or use more than one one?*

Put simply, use the extends option and reference the base file. I found [an example here](https://codepunk.io/multiple-tsconfig-files-for-a-single-typescript-project/) that shows this pretty well. [The example is an older reference. Some options may have changed with newer TS version releases!]

Here is a simplified file example from my own usage, too:

*Note that this differs from transpiling, which we will discuss in a future post.*

Technically, other compiler options, like Babel, could be used. However, in my own experience, I’ve most often seen the TypeScript Compiler. In any case, we need to convert TypeScript code to JavaScript code!

*Oh, and did you know that *tsc* is actually also written in TypeScript and compiled into JavaScript?* 

🤯 I know, it blew my mind, too, when I heard [Josh Goldberg](https://www.linkedin.com/in/joshuakgoldbergcodes/) mention this in a recent talk I heard!

```js
// Base file: tsconfig.json

{
  "compilerOptions": {
    "target": "es2020",
    "module": "CommonJS",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "skipLibCheck": false
  },
  "exclude": [
    "node_modules/**/*",
  ]
}
```

Then, we have a debugger setup in which we want to ensure everything else is the same, but in this case, we want source mapping to be used:

```js
// Debugger tsconfig file extends the base file: 
// tsconfig.debug.json

{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": true
  }
}
```

When we want to run the debugger, this extended tsconfig file is used on top of the original!

## 📚 Resources for further reading

- [TypeScript Documentation](https://www.typescriptlang.org/docs/) 
- `tsc` / [Compiler section](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#tsc-the-typescript-compiler)
- [“TypeScript in 5 Minutes”](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [tsconfig.json](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
  - [Wikipedia on TypeScript](https://en.wikipedia.org/wiki/TypeScript#:~:text=Development%20tools-,Compiler,that%20can%20execute%20the%20compiler.)
  - [Wikipedia on Compiler](https://en.wikipedia.org/wiki/Compiler)
  - [Contentful article](https://www.contentful.com/blog/what-is-typescript-and-why-should-you-use-it/)
  - [Visual Studio Code](https://code.visualstudio.com/docs/typescript/typescript-compiling#_tsconfigjson)tsconfig[details](https://code.visualstudio.com/docs/typescript/typescript-compiling#_tsconfigjson)
  - O’Reilly Books:
- [Programming TypeScript by Boris Cherny](https://www.oreilly.com/library/view/programming-typescript/9781492037644/)
- [Effective TypeScript by Dan Vanderkam](https://www.oreilly.com/library/view/effective-typescript-2nd/9781098155056/)
- A [snippet](https://www.oreilly.com/library/view/effective-typescript/9781492053736/ch01.html#:~:text=TypeScript%20is%20a%20bit%20unusual,that%20runs%2C%20not%20your%20TypeScript.) from this book via O’Reilly
  - [Learning TypeScript by Josh Goldberg](https://www.oreilly.com/library/view/learning-typescript/9781098110321/)
- I haven’t read it as of this writing, but I’ve seen him speak a few times, and I’m excited to start it after wrapping up a couple of other books!
  - [TypeScript Cookbook by Stefan Baumgartner](https://www.oreilly.com/library/view/typescript-cookbook/9781098136642/)
- I haven’t read it as of this writing, but I’ve heard good things and it’s on my list.

## Keep exploring TypeScript
