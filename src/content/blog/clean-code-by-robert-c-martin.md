---
title: "clean code by robert c. martin"
description: "A practical breakdown of Clean Code by Robert C. Martin: key takeaways on naming, functions, comments, and writing code your team can actually maintain."
pubDate: 2024-02-20
tags: []
readingTime: 8
---

## *Clean Code* is a **classic**.

I am not the first to summarize; I won’t be the last! Thank you to my partner for gifting this book to me when I started my career change. 🙏 After I read *Clean Code: A Handbook of Agile Software Craftsmanship, *it was requested I share insights with my team. Any chance to share knowledge is a win! I share the details included in my presentation here, focusing on the most widely applicable content.

**Quick notes:**

- ❌ *The author uses Java-specific references frequently. I’ve removed these because they aren’t relevant to myself or my team.*
- 👀* There’s an immense level of detail. Please feel free to jump around as you see fit!*
**Here, we’ll cover:**

- 🎬 The Presentation
- 💡 My 3 Big Takeaways
- 💻 What is clean code?
- 🏗️ Foundations: names, functions, comments, and formatting
- 🚀 Put it into Practice
- 🥸 Code Smells
- 🤔 Questions to consider
- 🫶 Bonus Recommendation

## 🎬 The Presentation

The conversation that was sparked pleasantly surprised me when I presented to the team in the Western hemisphere. Some insights:

- Although one teammate read this several years ago, it’s still pertinent for them in their current DevOps role!
- Our team is responsible for taking this seriously and taking the time to do this in our daily work.
- We all need to practice this, regardless of our current experience level.
[Here is a link to the slides!](https://www.canva.com/design/DAF5m0phHYY/vB6CGXGNUejdrCYUo4uTKw/edit?utm_content=DAF5m0phHYY&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton) And here’s a Loom recording of the presentation (~15 minutes):

### **Thanks so much for reading!** ✨

Subscribe to receive occassional blog posts!
Your contact information will never be sold.

## 💡 My 3 Big Takeaways

1. **Writing code is a process**. Start with a draft, refine, and repeat. It takes practice.
2. What ultimately matters is that your team **agrees on standards and sticks to them**.
3. It is ***everyone’s responsibility**** *to keep a codebase clean!

## 💻 What is clean code?

For me, clean code is beautiful and embodies ***discipline***. It is concise and clear to any reader. Business needs and team members will inevitably change! So, it’s important to hone the craft to solve a problem with meaningful code for others to understand.

I especially like the application of the referenced “broken windows” metaphor:

> "A building with broken windows looks like nobody cares about it. So, other people stop caring. They allow more windows to become broken. Eventually, they actively break them. They despoil the facade with graffiti and allow garbage to collect. One broken window starts the process toward decay."
>
> Dave Thomas & Andy Hunt

> "Of course bad code can be cleaned up. But it’s very expensive. As code rots, the modules insinuate themselves into each other, creating lots of hidden and tangled dependencies."

Several other interpretations of “clean code“ were provided by others in the industry. Here are some of the meaningful interpretations I extracted:

- elegant/pleasing
- efficient
- readable
- does one thing well
- easy for others to enhance
- well-tested
- minimal/simple and orderly, well-cared-for
- no duplication
- no surprises - **it returns exactly what you expect**
Without developer discipline, building new features slows over time. As the mess grows, so does the time needed for the codebase, especially for new team members! They must wade through it to make an impact.

Clean code sometimes requires pushback on timelines (within reason) for higher-quality output. Other team members (i.e., managers or product) rely on our honest estimations. Sure, we could get it working as a bare minimum, but we also need time to care for the code, keeping the product/service smooth and efficient. This should be acknowledged and considered. Why? Because even when we say we’ll return to it, historically, we won’t.

Tidiness takes a team effort to clean up - and maintain - the codebase. Martin recommends the Boy Scout rule when working: “Leave the campground better than you found it.” Care about your craft!

## 🥸 Code Smells

Below is a table of common issues provided by Martin (excluding Java-related items).

You may need to scroll to see all the goodies!

## 🏗️ Foundations: names, functions, comments, and formatting

What does this actually consist of? Let’s cover major areas where pain points arise.

## Names

What’s in a name anyway? Well, a lot of meaning, actually!

### **Variable Naming Tips:**

**USE**

- Pronounceable - “Humans are good at words…If you can’t pronounce it, you can’t discuss it without sounding like an idiot.”
- Searchable - For example, static numbers or hard-to-read code like a regex pattern for a valid phone number `^\+[1-9]\d{1,14}$` could have a named variable of `validE164FormatRegex` instead.

- Intention-revealing
- Meaningul context - Instead of a vague `id` variable, we can be more specific with something like `serviceXCustomerID` to make it clear what we’re working with.
**AVOID**

- Disinformation - If a variable is a number, it should not be named `moneyString`!
- Abbreviations
- Unnecessarily long names or similar spelling
- Characters that look alike - Common offenders are lowercase `L` and uppercase `i` or number zero and uppercase `o`.
- Number series naming - `a1` and `a2` mean nothing to the reader in a program.
- Avoid programming terms when a variable is not used for that use
- Noise words - These include words like “a” or “the” if it doesn’t add useful meaning.
- Encodings and mental mapping - This adds unnecessary cognitive load to decipher meaning.

### **Class Naming Tips:**

**USE**

- Verb/verb phrases for methods - Methods take action!
- One word per concept - Try to retain the same lexicon and be consistent.
- Solution domain - Use commonly known terms that programmers will understand.
- Problem domain - When there is no “programmer-ese,” rely on the problem space to describe the class.
- Meaningful context
**AVOID**

- Noun phrase names
- Too much context
- Cleverness, slang, puns - Too many teams are globally distributed, and these won’t have the same meaning in all countries or even within different teams in the same country!

## Functions

Functions are the heart of any program. They should have consistent blocks and indentation for an easily followed nested structure. 

- Functions should also be small. How small?

**That’s a wrap!**

## 🤔 Questions to consider:

1. Have you read *Clean Code? *Did you have any different insights or any I missed?
2. What was your favorite or least favorite part?
3. Do you agree/disagree with anything “Uncle” Bob Martin shared that I have listed?
4. Have you - or are you - putting anything into practice in your daily work?
5. Is this most relevant to new engineers, or is it also useful for seniors or man

> "The first rule of functions is that they should be small. The second rule of functions is that they should be smaller than that."

> "So too being able to recognize clean code from dirty code does not mean that we know how to write clean code!"
>
> Chapter 1, “The Art of Clean Code?”

- Functions should only do one thing.
- The output should be exactly what you expect.

- If you can, extract another function.

- Functions should have one level of abstraction.
- The function should only be able to access one abstraction level below itself.
  - Functions should be able to be read from top to bottom.
- Well-written code reads like a narrative as if in a set of “to” statements.
  - Avoid switch statements when possible.
- Switch statements are hard to keep small, but they are sometimes useful. When using switch statements, Martin recommends burying it as low-level as possible, preferably in a class (creating polymorphic objects), to ensure it is not repeated and hide it from the rest of the code.
  - Use descriptive names for functions.
- Verbs or verb phrases are great here. Let’s name functions by the action they perform! Don’t be afraid of long names if it adds clarity.
  - Keep function arguments to a minimum.
- Think carefully and use a data structure if you need more than 2 arguments.
- Verbs or keywords can make the intended use of arguments more obvious.
  - Functions should have obvious side effects.
- If a side effect is intended, make that clear in the name. Avoid it if possible.
  - Functions should either do something or answer something, but not both.
  - Prefer exceptions to returning error codes.
- Martin recommends exceptions to handle errors separately.
  - Don’t repeat yourself (DRY).

## Comments

Everyone has their own view on this. Regardless, note point 2 in my main takeaways. If your team agrees on a pattern, adopt the pattern. Ultimately, the best advice I’ve received is that a comment should explain ***why*** you made a decision (like business needs) and not ***what*** your code is doing.

- Delete dead code.
- We have version control for a reason!
  - Good comment examples:
- legal comments
- informative, truly useful comments
- explanation of intent
- amplify section importance
- add clarification
- warning of consequences
- TODO comments (within reason)
  - Bad comment examples (most comments):
- mumbling, personal journal/log comments
- redundant comments
- misleading comments (not precise enough to be accurate)
- mandated comments or noisy comments
- don’t use a comment when you can use a function or a variable!
- position markers
- closing brace comments
- attributions and bylines
- commented out code
- HTML comments
- nonlocal info
- too much info
- not obvious connections
- function headers

## Formatting

Why is this a foundation? It’s too important to ignore, and so many linting tools exist. There’s no excuse. Because there are many tools, I won’t go into excessive detail!

- Vertical formatting (200-500 lines per file recommended)
- smaller files reduce scrolling
- space between concepts keeps them readable
- order concepts from high to low priority

- Horizontal formatting (20-60 characters per line, 45 on average recommended)
- keep lines short
- horizontal spacing can add clarity and understanding
- indentation shows the hierarchy
- avoid silent/floating semi-colons!
Again, it doesn’t matter what you do for formatting as long as everyone agrees and follows it on the team! 

We’ve covered the foundational concepts! But, as Martin says, just because we might be able to recognize “dirty” code or “code smells,” we must also put it into practice!

## 🚀 Put it into Practice

To put some of the following chapters into practice, I’ve pulled some of the more interesting or applicable concepts and suggestions!

- Abstract and hide your data:
- Reduce data manipulation and exposure where it doesn’t belong.
- Data structures expose data and don’t have meaningful functions.
- Objects hide data behind abstractions and expose functions to operate on the data.
  - Error handling:
- Martin recommends exceptions over errors to keep the calling code cleaner and extract error-handling logic.
- Provide context with your exceptions for more informative error messages.
- Wrap third-party APIs to best handle errors from the source.
- Avoid passing or returning null. Sometimes, an API may return null, and you cannot avoid it.
  - Boundaries for Third-Party Tools:
- Wrap an implementation around third-party code to control what is used and reduce affected code when a change you can't control occurs.
- Read the docs, test and explore a tool, and build “learning tests” (super powerful to identify API changes early) to get to know the API well!
- Define the interface you *want* when you face the unknown. This guides design decisions. It’s better to depend on the code you can control!
  - Unit Tests:
- Tests are just as important to keep clean! Write small, readable tests.
- Tests reduce fear of maintenance, refactors, or improvements.
- Test code doesn’t need to be as efficient as production code.
- Focus on one concept per test. Ideally, use only one assertion per test - or minimal - for easier debugging.
- Clean tests have 5 FIRST rules:
- FAST - should run quickly, so you run them often/fix them ASAP
- INDEPENDENT - should not depend on each other, diagnosis is difficult
- REPEATABLE - able to happen in any environment, reduce failure excuses
- SELF-VALIDATING - boolean output, pass or fail
- TIMELY - write in a timely fashion *just before* the production code
  - The three laws of TDD (Test-Driven Development) from the book:
- 1. You may not write production code until you have written a failing unit test.
- 2. You may not write more of a unit test than is sufficient to fail, and not compiling is failing.
- 3. You may not write more production code than is sufficient to pass the currently failing test.
    - Classes:
- Classes should be small! “The first rule of functions classes is that they should be small. The second rule of functions classes is that *they should be smaller than that*.”
- Avoid a “god class” that tries to do all things.
- Follow the Single Responsibility Principle.
  - Organize classes in the common standard: list variables, private instance variables, then easily read from top to bottom with important items at the top.
  - Organize classes to reduce change in the case of adding functionality later and isolate the class as much as possible from external change.
    - Systems:
- For systems, consider an example from the book:
- A hotel is ***built*** by construction and engineering teams.
- A hotel is ***used ***by regular people on a vacation or business trip.
- These functions are entirely independent and build/use should be the same in systems, too! E.g. Separate tests from the compilation.
  - Separate the construction of a system from the usage implementation.
  - Dependencies of “main” should direct ***away*** from “main.”
- The Single Responsibility Principle or Inversion of Control moves responsibilities from an object to others dedicated to the purpose.
- Meaning an object doesn’t instantiate dependencies itself.
  - Implement only what’s needed today; refactor and scale over time (incremental agility).
- Evolve from simple to sophisticated over time and with more resources!.
  - Optimize decision-making with modularity and separation of concerns; no one person can make decisions. 
- “We often forget that it is also best to *postpone decisions until the last possible moment.*”
- Waiting allows for informed decisions.
  - Domain-specific language helps code read like structured prose a domain expert might write. This reduces incorrect translations!
    - **Final thoughts and reminders:**
- Run all the tests! They should be easy.
- Refactor! It should be incremental (write, pause, reflect, write).
- Write dirty code, then clean it up. 🧹
  - Eliminate duplication and ensure clear expressiveness for others to read.
  - Choose good names, keep functions and classes small (but not too small), and use standard nomenclature and programming patterns.
  - Practice makes perfect!
