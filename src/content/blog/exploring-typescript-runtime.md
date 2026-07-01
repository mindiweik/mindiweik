---
title: "exploring typescript: runtime"
description: "What's the deal with runtime?"
pubDate: 2024-08-20
tags: ["typescript"]
readingTime: 6
---

This is part of a semi-monthly series that will put TypeScript under a microscope to become more adept overall. 🔬

Understanding the nitty gritty bits and pieces of a language can only benefit us as software builders!

**This post will cover runtime.**

1. 🤔 What is runtime?
2. 🦾 Reconstruct and confirm runtime types
3. 📚 Resources for further reading
**Let's go!**

## 🤔 What is runtime?

To start, let’s better grasp what type of “runtime” I’m referring to and what it actually means in that context.

Here, **runtime** refers to the process of a computer interpreting and performing a program’s instructions. Think of each line of code in your program or file as a line of instructions to be carried out!

In the first post of this series, I wrote about the [TypeScript Compiler](/22-jmeter-performance-testing-part-2).

### *What does the compiler have to do with runtime?*

We learned that JavaScript code is generated from our TypeScript code through the compilation steps, which is what our runtime will use! JavaScript runtime is often executed in Node but could also be accomplished using Deno, Bun, or a web browser.

It’s interesting to note that TypeScript is statically typed. The types are checked at compile time, not runtime, like JavaScript or other dynamically typed languages. This process checks your code to help find syntax issues or correct misusage in advance. 

Why is this helpful?

- This allows your IDE to offer some powerful tooling and reduces errors upfront! 
- Issues can be caught before a user experiences something your team missed.
  - You’ll achieve better readability and maintainability for your future self and teammates. When written well, TypeScript reads like good documentation.
- There should also be less cognitive load, scrolling, and searching for files; your IDE will show you relevant information when you mouse over variables!

### *What does runtime have to do with TypeScript, then?*

Simply put, TypeScript types don’t exist at runtime.

### ***Come again?***

Yes, that’s right. TypeScript types are “erasable,” removed from the compiled code. Interfaces and type annotations also fall under this umbrella of removed code. Although we haven’t covered [declaration files](https://www.typescriptlang.org/docs/handbook/2/type-declarations.html#dts-files), the types and interfaces described in these files will also disappear.

If you recall, we compile TypeScript code into JavaScript. TypeScript is a superset of JavaScript and adds more functionality *on top of* JavaScript. 

As a result, TypeScript-specific features and functionality disappear and can’t affect your JavaScript code. Therefore, interfaces, types, and type annotations cannot affect runtime behavior.

**That’s not at all to say that TypeScript is useless!** On the contrary, it empowers your JavaScript code output and developer experience if you take advantage of them, even if aspects disappear when your program hits runtime.

***In my opinion, the biggest benefit of using TypeScript types is having a pre-defined “shape” of the types you work with.***

This requires thoughtful intention! I’ve worked on projects that aren’t strict with typing and it caused me some headaches. When done well, defined shapes have clarified *exactly* what I’m working with while building and developing. 

As a simple example to play around with type “shape,” here we define the “shape” of an object we want to use to describe my three pets:

In this way, although TypeScript types and true type checking won’t exist in the generated JavaScript, we can confirm which types we are working with and how we want to utilize them in a way that will translate into runtime. The generated JavaScipt code looks identical in this case!

We can use a similar concept with objects. Let’s say we’re now talking about storing art pieces in galleries!

```js
interface Art {
  title: string
  artist: string
  paint?: 'acrylic' | 'watercolor' | 'oil' | 'other'
  digital?: 'photo' | 'video' | 'slideshow' | 'other'
}

// Perhaps we want to handle these mediums differently:
// Paintings are stored in one gallery, digital art in another.

const paintingGallery: Art[] = []
const digitalGallery: Art[] = []

const moveArtworkToGallery = (artwork: Art) => {
  if ('paint' in artwork) {
    // Move a painting to the painting gallery
    paintingGallery.push(artwork)
  } else if ('digital' in artwork) {
    // Move digital art to the digital gallery
    digitalGallery.push(artwork)
  } else {
    // Again, unlikely, but this is unknown art we're handling!
    throw new Error('We need a different gallery for this piece!')
  }
}

moveArtworkToGallery({
  title: 'The Starry Night',
  artist: 'Vincent van Gogh',
  paint: 'oil'
})
moveArtworkToGallery({
  title: 'Self',
  artist: 'Mindi',
  digital: 'photo'
})
moveArtworkToGallery({
  title: 'Two Calla Lilies on Pink',
  artist: 'Georgia O\'Keeffe',
  paint: 'watercolor',
});

console.log('Painting Display:', paintingGallery)
// list should have 2 paintings
console.log('Digital Display:', digitalGallery)
// list should have one photo
```

```js
npm install typescript --save-dev
```

```js
tsc file-name.ts
```

Again, the JavaScript code generated appears almost identical! The interface is the main element missing from the compiled code this time, but we can still determine a rough type using property checking in the moveArtworkToGallery function.

The property check only involves values that are available at runtime but still allows the type checker to refine the object's shape to the Art type. That’s great TypeScript code practice and translatable JavaScript all at once!

### **Use a discriminated (or “tagged”) union**

This concept is similar to the object case above, and I’ve found it useful to specifically use the field name type, especially for building APIs. As a user I’ve seen it often in third-party APIs, so I feel it’s a common enough practice to lean on.

We are essentially doing property checking again, but in my experience, this is often with a set list of known types. Perhaps this list is described in the API documentation.

Let’s return back to the example of my three pets!

```js
// For reference, let's restate the interface shape:

interface Pet {
  name: string
  age: number
  type: 'cat' | 'dog'
}

// In this example, we want to do act on the different types!

const makePetSound = (pet: Pet): string => {
  if (pet.type === 'cat') {
    return 'Meow!'
  } else if (pet.type === 'dog') {
    return 'Woof!'
  } else {
    throw new Error('Unknown pet type!')
  }
}

const dog1: Pet = {
  name: 'Rigby',
  age: 6,
  type: 'dog'
}

console.log(makePetSound(dog1)) // Woof!
```

```js
// First, we'll define the shape

interface Pet {
  name: string
  age: number
  type: 'cat' | 'dog'
}

// Then, we'll try to work with that shape!

const dog1: Pet = {
  name: 'Rigby',
  age: 6,
  type: 'dog'
}

// This is valid 

const cat1: Pet = {
  name: 'Buzz',
  age: 3,
  type: 'cat'
}

// This is valid

const dog2: Pet = {
  name: 'Rayla',
  age: '6 months',
  type: 'dog'
}

// This won't work!

// Type 'string' is not assignable to type 'number'.

const cat2: Pet = {
  name: 'Imaginary',
  type: 'cat'
}

// This won't work either, we're missing something!

// TypeScript complains here:
// Property 'age' is missing in type '{ name: string; type: "cat"; }' but required in type 'Pet'.
```

When using a [discriminated union](https://dev.to/darkmavis1980/what-are-typescript-discriminated-unions-5hbb) (or “tagged” union as it’s described in *[Effective TypeScript](https://www.oreilly.com/library/view/effective-typescript-2nd/9781098155056/)*), we are essentially implementing some kind of type storage in our object using a “tag” that we can access and use at runtime.

How can we access this? It’s because there is also a value stored in the type field.

**I hope that these examples were helpful! Considering how your runtime will read and follow your instructions through your TyeScript code after compilation may help you build better!**

## 📚 Resources for further reading

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [“TypeScript in 5 Minutes”](https://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
  - [Wikipedia on TypeScript](https://en.wikipedia.org/wiki/TypeScript#:~:text=Development%20tools-,Compiler,that%20can%20execute%20the%20compiler.)
  - [Wikipedia on Runtime](https://en.wikipedia.org/wiki/Execution_(computing)#Runtime)
  - [Contentful: “TypeScript vs. JavaScript: Explaining the differences”](https://www.cvs.com/store-locator/belleville-il-pharmacies/5720-n-belt-west-belleville-il-62226/storeid=18009)
  - [TotalTypeScript: “No, TypeScript Types Don’t Exist At Runtime”](https://www.totaltypescript.com/typescript-types-dont-exist-at-runtime)
- There are a few interesting exceptions to the rules here covered more in-depth: enums, namespaces, and parameter properties.
  - [Log Rocket: “Methods for TypeScript runtime type checking”](https://blog.logrocket.com/methods-for-typescript-runtime-type-checking/)
  - O’Reilly Books:
- [Programming TypeScript by Boris Cherny](https://www.oreilly.com/library/view/programming-typescript/9781492037644/)
- [Effective TypeScript by Dan Vanderkam](https://www.oreilly.com/library/view/effective-typescript-2nd/9781098155056/)
- [Learning TypeScript by Josh Goldberg](https://www.oreilly.com/library/view/learning-typescript/9781098110321/)
- I’m reading this as of this writing. I’ve seen him speak, and his humor and conciseness come across well in print!
  - [TypeScript Cookbook by Stefan Baumgartner](https://www.oreilly.com/library/view/typescript-cookbook/9781098136642/)
- It was unread by me as of this writing, but it’s on my list.

## Keep exploring TypeScript

Before we run this code, we’ll encounter issues. In VSCode, for example, a little red squiggly identifies issues with the code snippet.

- We tried to use a string to describe Rayla as ‘6 months’ instead of the expected number input for her age (0, 0.5, or 1 depending on your own interpretation). Whoops! What were we thinking?
- Afterward, we created an imaginary cat. Because it’s not real, we aren’t sure how old it is! Bummer. Alas, Pet as an interface is looking for an age field.

### *Wait, this example uses an interface, and that goes away after compile time, right?*

Correct; I’m so glad you brought that back to the forefront. Let’s look into how you can still ensure type safety at runtime!

## 🦾 Reconstruct and confirm runtime types

Although TypeScript-specific features don’t exist at runtime, there are ways to ensure that runtime is safe. Don’t fret!

Here’s a great summary pulled from *[Effective TypeScript](https://www.oreilly.com/library/view/effective-typescript-2nd/9781098155056/)* that is a quick way to describe some of what we’re about to cover:

> "TypeScript types are not available at runtime. To query a type at runtime, you need some way to reconstruct it. Tagged unions and property checking are common ways to do this."

If given the time to contemplate, one could probably come up with all sorts of ideas and examples. But here, we’ll cover 3 I use pretty frequently, plus examples.

1. Validate inputs from external sources
2. Check types or properties to handle in your code
3. Use a discriminated (or “tagged”) union
**Hint:** You can use the following commands to follow along with examples in #2 and #3 using TypeScript in Node!

```js
// compiles your file into JavaScript
tsc file-name.ts

// runs your compiled code in Node
node file-name.js
```

### **Validate inputs from external sources**

You can usually find me building APIs with TypeScript. 

This means we receive data from the outside world for most endpoints, which we have no control over, sent to us. Malicious actors may send questionable data to attempt to take advantage of our API! 

I recommend validation because we honestly have no idea what a user (whether malicious or misinformed) may try to send us. You could build your own, but I’ve had success using [Zod](https://zod.dev/). It has excellent documentation and significant support. I’ve heard [Yup](https://github.com/jquense/yup) is also great, though I haven’t used it personally!

Using validation, we can check that the input is exactly what we need. It can even stop incorrect types in their tracks! At least in my experience with Zod, we can add all sorts of check layers to refine user input before our server fully interacts with it.

**Here are a couple of examples:**

```js
// Let's look at simple string inputs first:

// We want at least 1 character & trim excess white space for first name
// Say we don't require the last name, we can make it optional
// And we can use a built-in Zod email validator for the email!

const stringSchema = z.object({
  firstName: z.string().min(1).trim(),
  lastName: z.string().optional(),
  email: z.string().email(),
})

// Next, let's take in a number and set up some boundaries!

// We want a positive number from 1-100 for some kind of code indicator.
// `gte` is an alias for minimum
// `lte` is an alias for maximum

const numberSchema = z.object({
  code: z.number().positive().gte(1).lte(100),
})
```

Another great thing I’ve used with Zod is my own extra layer of refinement to validate the incoming data. Here are two slightly more involved examples:

```js
// Let's say we need an E164 format phone number string.
// We can add our own regular expression and check function for this:

const NORTH_AMERICAN_E164_PHONE_NUMBER_REGEX = /^\+1\d{10}$/

const isE164FormatPhoneNumber = (value: string): value is E164FormatPhoneNumber =>
  NORTH_AMERICAN_E164_PHONE_NUMBER_REGEX.test(value)

// We'll use it in our schema, plus a helpful message for the user!

const phoneNumberSchema = z.object({
  phoneNumber: z.string().refine(isE164FormatPhoneNumber, {
    message: 'Should be a phone number in E164 format',
  }),
})

// What about using an enum for 2 North American country codes?
// Users won't know about enums, but we can replicate that, too!

// This isn't a true enum; we'll cover this style in some future post.

const countryCodes = ['US', 'CA'] as const

const countrySchema = z.object({
  isoCountry: z.enum(countryCodes),
})
```

…And there are all sorts of maneuvers like this you can use to check your data from the outside world to ensure it’s about as safe as you can manage - both for type safety and input security!

### **Check types or properties to handle in your code**

When working with multiple potential types, it’s a good idea to confirm the input's “shape” or data type. This is great both in your TypeScript code and for runtime! 

This could be a simple check when you expect, for instance, one type or another. Maybe we know a phone number could be provided as a string or a number, and let’s assume we know the input has the right character count or number length already, but we want the same [E164 format output](https://www.twilio.com/docs/glossary/what-e164) for a North American phone number in either case:

```js
const phoneNumberToE164String = (input: string | number): string => {
  // We know we need to transform either kind to align with E164
  let result = '+1'

  if (typeof input === 'number') {

    // input is definitely a number in this block
    return result += input.toString()

  } else if (typeof input === 'string') {

    // input can only be a string in this block
    return result += input

  } else {

    // Probably an unnecessary check, but something went wild 
    // if we get here we should handle
    throw new Error('Invalid input')

  }
}

const test = phoneNumberToE164String(5555555555) // A number is provided
console.log(test, typeof test) // +15555555555 string
```
