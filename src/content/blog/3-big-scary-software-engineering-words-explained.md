---
title: '3 big, scary software engineering words explained'
description: 'Idempotent | Polymorphism | Isomorphic'
pubDate: 2024-06-25
tags: ['fundamentals', 'backend']
readingTime: 3
---

A simple Google search often clarifies the meaning of unknown terms I encounter as a Software Engineer. Sometimes, though, they seem more complicated and require a second (or even third or fourth) look to understand them better.

We’ll cover three of these terms that have given me past trouble. I hope I can reduce your search just a smidge! 🙃

**Here we’ll cover:**

- What are these words?
- What do they mean to a Software Engineer?
- And what is an example to point to?

**Let’s dive in!**

## ♻️ idempotent

**Simplified Meaning:**

- The **same result is produced every time** an operation with a particular input is submitted as if it were only submitted once.

**Use case:**

- This typically refers to HTTP `GET`, `PUT`, or `DELETE` requests. This ensures reliability, consistency, and fault tolerance when working with a [RESTful API](https://www.redhat.com/en/topics/api/what-is-a-rest-api).
  - `GET` is technically idempotent because it retrieves and does not change a resource.
- If the request is incomplete due to an error or issue, the client can resubmit the request to achieve the desired end result.

**Example:**

- A client submits a `PUT` request to change a user’s [E164 format](https://www.twilio.com/docs/glossary/what-e164) phone number from its original:

```json
{
  "name": "Mindi",
  "email": "mindi@test.com",
  "phone": "+18885551234"
}
```

…to:

```json
{
  "name": "Mindi",
  "email": "mindi@test.com",
  "phone": "+18885550001"
}
```

- If an unexpected error occurs at any level of the process, the client should be able to resubmit the request and expect the same result.
- No matter how often the client submits this exact `PUT` request, even if the user goes wild and submits 100 times, the E164 format phone number should ultimately reflect the desired update `+18885550001`.

**Useful resources:**

- [Wikipedia](https://en.wikipedia.org/wiki/Idempotence#:~:text=which%20is%20idempotent.-,Computer%20science%20meaning,-%5Bedit%5D)
- [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Glossary/Idempotent)
- [REST API Tutorial: Idempotent REST API](https://restfulapi.net/idempotent-rest-apis/)
- [VIDEO: Alex Hyett](https://www.youtube.com/watch?v=XAccGbtl3Z8)

## 🔀 polymorphism

**Simplified Meaning:**

- Different objects can be treated as common, enabling **the same operation to work uniquely on different objects**.
- Ultimately, it refers to a programming aspect’s ability to appear similar but operate differently in certain scenarios.

**Use case:**

- Method overloading (see below example).
- Accept various function parameters.
  - For instance, if a function can accept an `id` that is either an integer or a string and operate upon it properly after determining which it has received.
- In my research, this can also apply to things like TypeScript types and interfaces.
- Using shared, common functionality allows for more flexible, scalable, and maintainable code long-term.

> A common use of polymorphism in OOP is when a parent class reference is used to refer to a child class object. - [Margaret Rouse](https://www.techopedia.com/contributors/margaret-rouse), Techopedia

**Example:**

- Here, let’s do something simple. We’ll use Python to make a base `Animal` class and `Dog` and `Cat` derived classes to overwrite a core `Animal` class method.

```python
class Animal:
  def sound(self):
    return "Each animal makes a unique sound!"

class Dog(Animal):
  def sound(self):
    return "woof woof"

class Cat(Animal):
  def sound(self):
    return "meow meow"
```

- When we create a function that can use any of these classes, we will see that an extensible class allows us to get the expected output from our cat or dog.

```python
def animal_sound(critter):
    print(critter.sound())

# Create instances of Dog and Cat
dog = Dog()
cat = Cat()

# Call the animal_sound function with different types of animals
animal_sound(dog)  # Outputs: woof woof
animal_sound(cat)  # Outputs: meow meow
```

**Useful resources:**

- [Wikipedia](<https://en.wikipedia.org/wiki/Polymorphism_(computer_science)>)
- [Techopedia](https://www.techopedia.com/definition/28106/polymorphism-general-programming#:~:text=With%20polymorphism%2C%20each%20subclass%20may,displaying%20trotting%20on%20the%20screen.)
- [Tech Target](https://www.techtarget.com/whatis/definition/polymorphism#:~:text=The%20word%20polymorphism%20is%20derived,biology%2C%20chemistry%20and%20drug%20development.)
- [VIDEO: iAmDev](https://www.youtube.com/watch?v=tIWm3I_Zu7I)

## 💻 isomorphic [javascript]

**Simplified Meaning:**

- JS code is written strategically to **run on the client OR the server**.
  - The project must maintain a minimum Node version and work on multiple browsers. Transpilers and polyfill tools implement modern JS features that may be missing, making this challenge a little easier!
  - Typically, you will use third-party libraries when writing your JS code and avoid using native Node libraries or browser APIs.
- General isomorphism in programming is slightly different ([Stack Overflow link](https://stackoverflow.com/questions/11245183/importance-of-isomorphic-functions), for edification).
  - This is when different programming structures/processes can be transformed into one another without losing info or functionality. They are essentially the same in structure or behavior but may look different.

**Use case:**

- A file or code snippet that can be run in either instance, improving modularity.
- A project using server-side rendering to increase app performance.
  - This isn’t magic - there may be other performance drawbacks.
  - This can also provide crawlers access to content to improve SEO.
- Reduce discrepancies and potential bugs with consistent logic and rendering.

**Example:**

- Let’s do something super simple. We’ll create a snippet to inform you which environment is running.

```js
// isomorphic.js

const defineEnvironment = () => {
  if (typeof window == 'undefined') {
    console.log('This is the server!');
  } else {
    console.log('This is the browser!');
  }
};

defineEnvironment();
```

- To run this in Node:
  - save the code
  - navigate to the file via a terminal or command prompt
  - run the script: `node isomorphic.js`
  - you should see “This is the server!”
- To run this in the browser:
  - open a browser’s dev tools
    - Google Chrome on a Mac = command + option + J
  - navigate to the console
  - paste the content of the `isomorphic.js` file into the console and run it
  - you should see “This is the browser!”

**Useful resources:**

- [Wikipedia](https://en.wikipedia.org/wiki/Isomorphism)
- [Medium Article from AirbnbEng](https://medium.com/airbnb-engineering/isomorphic-javascript-the-future-of-web-apps-10882b7a2ebc#.4nyzv6jea)
- [GitHub repo examples](https://github.com/topics/isomorphic-javascript)
  - I have not vetted these, but they seem interesting!
- [VIDEO: PortEXE](https://www.youtube.com/watch?v=tVaFAAAzHsw)

**Do you feel at least slightly more confident with these words now?**

**I sure hope so!** 🤭
