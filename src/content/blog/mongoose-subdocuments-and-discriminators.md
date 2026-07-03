---
title: "mongoose subdocuments & discriminators"
description: "Interesting Mongoose options for MongoDB collections!"
pubDate: 2024-02-07
tags: ["backend","databases"]
readingTime: 6
---

In a “greenfield” project where I contribute, we use MongoDB, mainly for it's _**future flexibility**_. This brand-new project contains a lot of unknowns! I’ll outline the problem we're solving.

**Here, I assume you are familiar with databases and general JavaScript coding concepts.** I will not cover how to connect to and use Mongoose alongside MongoDB outside of the Subdocuments and Discriminators options defined below. If you need an introduction, these references from freeCodeCamp are both excellent: [Mongoose 101](https://www.freecodecamp.org/news/mongoose101/) or [Introduction to Mongoose for MongoDB](https://www.freecodecamp.org/news/introduction-to-mongoose-for-mongodb-d2a7aa593c57/).

Our API proxy service will add a safety layer between the platform and a third-party vendor. Currently, we reach out directly to the vendor, causing multiple dependencies and a web of complicated actions which will need to be detangled and simplified.

Another long-term goal is to decouple our platform, allowing more vendor flexibility in the future. You never know when something will change with an API you don’t control. 😉

## why mongodb - or why a nosql database - you might ask?

Although there is a level of flexibility you can build and connect with relational databases and foreign keys, NoSQL databases are known for their flexible data structure capabilities. Ever-growing SQL tables leads to complicated queries and multiple join tables to access scattered data. Those queries can become expensive.

I mentioned the possibility of future third-party vendor(s). Preliminary research highlighted that the data across other possible vendors is just varied enough to need schema variation. Another win for MongoDB is that it can store multiple shapes of related data in the same collection! Don’t worry, we’ll cover this in more detail.

> “Generally, in MongoDB, data that is accessed together should be stored together.”
>
> Jesse Hall, MongoDB Developer [Article](https://www.mongodb.com/developer/languages/javascript/getting-started-with-mongodb-and-mongoose/)

…and that’s the perfect segway to the crux of this topic.

### in this post, we’ll cover:

- ❓ What is Mongoose?
- 📒 Mongoose Documents
- 📑 Mongoose Subdocuments
- 🙈🙉🙊 Mongoose Discriminators
- 🛠️ When and how to use these tools

## ❓ what is mongoose?

To more easily work with MongoDB, developers frequently use Mongoose. It’s not the only tool, and a tool is not required to use MongoDB, but tools provide structure and fluidity in my experience.

Mongoose is a popular third-party JavaScript library for Node.js. It helps to model, validate, and manipulate data along with plenty of other interesting capabilities. Mongoose is an ODM, or Object Data Modeling, library.

Mongoose provides more structure to developer interactions with MongoDB. The schema allows you to define the shape of your data and its expected types as well as additional options like default values, designated uniqueness, or indexing for example.

The model, on the other hand, applies your schema structure to each of the MongoDB documents. Models are then used for “CRUD” database actions on the records: creating, reading, updating, and deleting. View the [full list of Mongoose queries](https://mongoosejs.com/docs/queries.html) available.

To ensure our mental model is aligned, here’s an example of a base schema in JavaScript we will use to define a model we can work with:

```js
import mongoose from 'mongoose';
const { Schema } = mongoose;

const foodBaseSchema = new Schema({
  foodName: String,
  foodColor: String
});

const foodBaseModel = mongoose.model('Food', foodBaseSchema);
```

## 📒 mongoose documents

A Mongoose document is a mapping of a model. Your model should match the pre-defined schema(s). The Model class is a subclass of the Document class in the Mongoose [implementation](https://mongoosejs.com/docs/documents.html#:~:text=Document%20and%20Model%20are%20distinct%20classes%20in%20Mongoose.%20The%20Model%20class%20is%20a%20subclass%20of%20the%20Document%20class.%20When%20you%20use%20the%20Model%20constructor%2C%20you%20create%20a%20new%20document.). When you use a Mongoose query, you are interacting with the Mongoose Document.

Let’s build on the above example as we go. Here’s the basic implementation of creating a Document with our above base model:

```js
const foodDocument = new foodBaseModel();

/** Below is borrowed from the Mongoose documentation to
aid in understanding how a Model is a subclass of a Document. **/

foodDocument instanceof foodBaseModel; // true
foodDocument instanceof mongoose.Model; // true
foodDocument instanceof mongoose.Document; // true
```

## 📑 mongoose subdocuments

A Subdocument represents a Document embedded inside another Document. In other words, a Subdocument can also be defined as a schema within another schema.

As we work with Subdocuments, you might notice that they look pretty similar to Documents. They are! The main difference is a Subdocument will be added to a “top-level” or “parent” schema and can only be accessed and interacted with alongside the parent schema. Additionally, if you use any of the built-in Mongoose middleware or validation options on the Subdocument, this will be performed _before_ the Document to ensure everything is in order before proceeding at the top-level.

Meaning, Subdocuments are not stored in a separate table and accessed with a join table like when using a relational database. Subdocuments cannot exist without their parent , MongoDB stores all of this data in a single Document.

_(That said, MongoDB does have the [capability of a “join” view](https://www.mongodb.com/docs/manual/core/views/join-collections-with-view/) if you’re interested.)_

Okay, great, now that we have a pretty solid understanding of Subdocuments, let’s expand the `foodBaseModel` with a couple of ways to add Subdocuments!

```js
/** Let's define a schema for the ways we can cook said food item. **/
const cookSchema = new Schema({ type: String });

/** And we'll add a schema with data about how this item is grown. **/
const growSchema = new Schema({ detail: String });

const foodBaseModel = new Schema({
  foodName: String,
  foodColor: String,
  // Array of Subdocuments to list the cooking types we could use
  cook: [cookSchema],
  // Single nested Subdocument to allow us to define a growth schema
  grow: growSchema
});
```

#### subdocuments and nested paths are different

Before we move on, we should cover a common point of confusion. A nested path is not the same as a Subdocument, though they do look quite similar.

Try to keep an eye out for the subtle differences of this nested path example:

```js
const nestedFoodSchema = new Schema({
  foodName: String,
  foodColor: String,
  flavor: {
    delicious: Boolean,
    kidFriendly: Boolean
  }
});

const nestedFoodModel = mongoose.model('Nested', nestedFoodSchema);
```

Although this might look close to what we did above, and they may look similar via MongoDB, Mongoose treats these differently.

1. A nested path like the above must be defined upon Document instantiation to be valid whereas in our earlier Subdocument example, we can set the `cook` field to `undefined` to start. We can then more easily alter the `cook` field when ready!
2. Subdocuments are nested Documents if you recall. Because of this, Mongoose gives each Subdocument an `_id` Document identifier making it searchable as a Subdocument or within it’s parent Document.
3. Although you can certainly use JavaScript methods on a subdocument or nested path object, nested paths do not allow you to take advantage of the built-in Mongoose methods to interact directly with a Document’s list of Subdocuments like our `cook` field.
   If you need more clarification, I recommend referring to the Subdocument [documentation](https://mongoosejs.com/docs/subdocs.html).

## 🙈🙉🙊 mongoose discriminators

Discriminators essentially allow you to create schemas with varying object models to store within the same collection. This is an excellent option if you have a similar underlying schema structure, but you need slight differences.

When setting up a schema, an options object can be appended at the end as another parameter. In the case of Discriminators, a `discriminatorKey` in the options object is used with a value to define the Discriminator in the Documents. This key becomes searchable using the `__t` string path.

Once a Document is created with a Discriminator key, this key is not typically able to be updated by most methods. Though there are some update methods that use the `overwriteDiscriminatorKey` option to override this.

One other cool feature is that you can apply Discriminators to Subdocuments, too! Think about all the possibilities and flexibility your schema can have. 🤔

Let’s finish our example. First, we’ll revisit the base schema to add the `discriminatorKey` option:

```js
/** Subdocument Schemas **/
const cookSchema = new Schema({ type: String });
const growSchema = new Schema({ detail: String });

const foodBaseModel = new Schema({
  foodName: String,
  foodColor: String,
  cook: [cookSchema],
  grow: growSchema
}, {
  discriminatorKey: 'foodType'
});

const foodDocument = new foodBaseModel();
```

Then, we’ll create our separate schemas to add on top of our baseSchema with the `discriminatorKey`:

```js
const vegetableModel = foodDocument.discriminator(
  'vegetable',
  new Schema({
    isOrganic: Boolean,
    colorVariations: [String]
  }, {
    discriminatorKey: 'foodType'
  });

const grainModel = foodDocument.discriminator(
  'grain',
  new Schema({
    isFresh: Boolean,
    styleOptions: [String]
  }, {
    discriminatorKey: 'foodType'
  });
```

And finally we create the new Documents (including the Subdocuments) for each Discriminator type:

```js
const carrot = new vegetableModel({
  foodName: 'carrot',
  foodColor: 'orange',
  cook: [
    { type: 'roast' },
    { type: 'bake' },
    { type: 'saute' }
  ],
  grow: { detail: 'root' },
  isOrganic: true,
  colorVariations: [
    'purple',
    'white',
    'red'
  ]
});

carrot.save();
// We now have a carrot Document!

const bread = new grainModel({
  foodName: 'bread',
  foodColor: 'brown',
  cook: [
    { type: 'bake' },
    { type: 'fry' }
  ],
  grow: { detail: 'cooked dough with a flour base' },
  isFresh: true,
  styleOptions: [
    'croissant',
    'italian',
    'sourdough'
  ]
});

bread.save();
// We now have a bread Document!
```

## 🛠️ when and how to use these tools

Whether you use these options in a Mongoose project has the same answer heard frequently within the world of software engineering: _“It depends.”_

Should all Documents take advantage of Subdocuments if they have an associative object structure? No. Subdocuments are most useful for a specific schema to use and enforce for a nested object, the nested object should be searchable, or the option to leave the nested object structure off of the Document until a later time without having to define it up front could be used strategically.

And Discriminators? Yup - they’re not for every situation! I find Discriminators are best for unique situations. It’s not common to need slight variants on schemas. But, as I mentioned earlier, our case of slightly different data shapes for third-party vendor data is a great scenario for using the Discriminator option in Mongoose.

Personally, I’ve found that Mongoose has made development with MongoDB easy and enjoyable. The library is well-documented and both MongoDB and Mongoose have a great community with plenty of examples to draw from.

I hope you found the usage of Subdocuments and Discriminators by this non-relational database as interesting as I did!

**Sources:**

- [MongoDB Article: Getting Started with MongoDB and Mongoose](https://www.mongodb.com/developer/languages/javascript/getting-started-with-mongodb-and-mongoose/)
- Mongoose Documentation: [Documents](https://mongoosejs.com/docs/documents.html) | [Subdocuments](https://mongoosejs.com/docs/subdocs.html) | [Discriminators](https://mongoosejs.com/docs/discriminators.html)
- [Introduction to Mongoose for MongoDB](https://www.freecodecamp.org/news/introduction-to-mongoose-for-mongodb-d2a7aa593c57/) and [Mongoose 101](https://www.freecodecamp.org/news/mongoose101/) from freeCodeCamp
- BONUS Recommendation: [MongoDB Podcast](https://podcasts.mongodb.com/public/115/The-MongoDB-Podcast-b02cf624)
