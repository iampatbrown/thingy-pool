# Thingy Pool

# About

A promise-based object pool for [Node.js](https://nodejs.org/).

# Installation

```sh
$ npm install thingy-pool
```

# Creating a factory

The factory is responsible for creating and destroying the objects being pooled. The factory can also validate the objects if needed. See [Factory](#Factory) for more information

```js
const Api = require('some-api');

const factory = {
  create: async () => {
    const api = new Api();
    await api.connect();
    return api;
  },
  destroy: async api => {
    await api.disconnect();
    console.log(`${api} has been disconnected!`);
  },
};
```

# Creating a pool

See [Options](#Options) for a complete list of options

```js
const Pool = require('thingy-pool');
const factory = require('./myObjectFactory');

const options = { minSize: 2, maxSize: 5 };
const pool = new Pool(factory, options);
```

# Using the pool

```js
// or const fetchSomething = async () => {
async function fetchAndPrint(something) {
  const thingy = await pool.acquire();
  const result = await thingy.fetch(something);
  pool.release(thingy);
  console.log(`fetched ${something}: ${result}`);
}

fetchAndPrint('something'); // fetched something: result
fetchAndPrint('somethingElse'); // fetched somethingElse: result
```

Objects must be released back to the pool after they are used. Alternatively, a callback function can be given to `pool.use` and the pool will take care of acquiring and releasing the object. See below:

```js
async function fetchAndPrint(something) {
  const result = await pool.use(thingy => thingy.fetch(something));
  console.log(`fetched ${something}: ${result}`);
}

fetchAndPrint('something'); // fetched something: result
fetchAndPrint('somethingElse'); // fetched somethingElse: result
```

# Options

| Option                   | Type               | Description                                                                                               |
| ------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| minSize                  | `number`           | The minimum number of objects the pool will try to maintain including borrowed objects                    |
| maxSize                  | `number`           | The maximum number of objects the pool can manage including objects being created                         |
| defaultTimeoutInMs       | `number` or `null` | The default time in milliseconds requests for objects will time out                                       |
| maxPendingRequests       | `number` or `null` | The number of requests that can be queued if the pool is at the maximum size and has no objects available |
| checkIdleIntervalInMs    | `number` or `null` | The interval the pool checks for and removes idle objects                                                 |
| maxIdleToRemove          | `number` or `null` | The max objects that can be removed each time the pool checks for idle objects                            |
| softIdleTimeInMs         | `number` or `null` | The amount of time an object must be idle before being eligible for soft removal                          |
| hardIdleTimeInMs         | `number` or `null` | The amount of time an object must be idle before being eligible for hard removal                          |
| shouldAutoStart          | `boolean`          | Should the pool start creating objects to reach the minimum size as soon as it is created?                |
| shouldValidateOnDispatch | `boolean`          | Should the pool check objects with factory.validate before dispatching them to requests?                  |
| shouldValidateOnReturn   | `boolean`          | Should the pool check objects with factory.validate when they are being returned?                         |
| shouldUseFifo            | `boolean`          | Should the pool dispatch objects using first in first out (FIFO)?                                         |

# Pool Methods

### pool.acquire(options?) → {Promise\<T>}

Request an object from the Pool. If no objects are available and the pool is below the maximum size, a new one will be created

#### options = { priority?, timeoutInMs? }

| name        | type               | description                                                                 |
| ----------- | ------------------ | --------------------------------------------------------------------------- |
| priority    | `number`           | The priority for the request. The higher the number the higher the priority |
| timeoutInMs | `number` or `null` | Time in milliseconds before the request times out                           |

```js
const thingy = await pool.acquire();

// With custom priority
const thingy = await pool.acquire({ priority: 5 });

// With custom timeout
const thingy = await pool.acquire({ timeoutInMs: 5000 });

// With custom priority and timeout
const thingy = await pool.acquire({ priority: 10, timeoutInMs: 1000 });
```

### pool.clear() → {Promise\<void>}

Destroys all pooled objects that are currently available. Resolves after objects have been destroyed

```js
pool.getInfo(); // { size: 5, available: 2, borrowed: 3, ...moreInfo }
await pool.clear();
pool.getInfo(); // { size: 3, available: 0, borrowed: 3, ...moreInfo }
```

### pool.getInfo() → {[PoolInfo](#Pool-Info)}

Current object counts and pool's state

```js
pool.getInfo().available; // 2
// or
const { available, borrowed, size, state } = pool.getInfo();
```

### pool.getOptions() → {[Options](#Options)}

Current pool options

```js
pool.getOptions().defaultTimeoutInMs; // 30000
// or
const { maxSize, maxPendingRequests } = pool.getOptions();
```

### pool.getSize() → {number}

Total number of objects in the pool. Includes objects being created and excludes objects being destroyed

```js
pool.getSize(); // 3
```

### pool.has(object) → {boolean}

Checks if the object is part of the pool

```js
pool.has(thingy); // true
```

### pool.isBorrowed(object) → {boolean}

Checks if the object is currently borrowed

```js
pool.isBorrowed(thingy); // true
```

### pool.getState() → {PoolState}

Current pool state as a string

```js
pool.getState(); // 'STARTED'
```

### pool.release(object) → {Promise\<void>}

Returns the object back to the pool for future use

```js
const thingy = await pool.acquire();
pool.getInfo(); // { size: 5, available: 2, borrowed: 3, ...moreInfo }
const result = await thingy.doSomethingAsync();
await pool.release(thingy);
pool.getInfo(); // { size: 5, available: 3, borrowed: 2, ...moreInfo }
```

### pool.releaseAndDestroy(object) → {Promise\<void>}

Returns the object to the pool and destroys it

```js
const thingy = await pool.acquire();
pool.getInfo(); // { size: 5, available: 2, borrowed: 3, ...moreInfo }
const result = await thingy.doSomethingAsync();
await pool.releaseAndDestroy(thingy);
pool.getInfo(); // { size: 4, available: 2, borrowed: 2, ...moreInfo }
```

### pool.start() → {Promise\<void>}

Starts the pool

```js
await pool.start();
const thingy = await pool.acquire();
```

### pool.stop() → {Promise\<void>}

Stops the pool

```js
const thingy = await pool.acquire();
const finalResult = await thingy.doSomethingAsync();
pool.release(thingy);
pool.stop();
```

### pool.use(callback, options?) → {Promise\<any>}

Use a pooled object with a callback and release to object automatically

#### options = { priority?, timeoutInMs? }

| name        | type               | description                                                                 |
| ----------- | ------------------ | --------------------------------------------------------------------------- |
| priority    | `number`           | The priority for the request. The higher the number the higher the priority |
| timeoutInMs | `number` or `null` | Time in milliseconds before the request times out                           |

```js
const result = await pool.use(thingy => thingy.doSomethingAsync());
```

# Pool Info

```js
pool.getInfo();
```

| property                  | type     | description                                                                                              |
| ------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| available                 | `number` | Number of objects that a available for requests                                                          |
| beingCreated              | `number` | Number of objects being created                                                                          |
| beingDestroyed            | `number` | Number of objects being destroyed. Not included in the total pool size                                   |
| beingValidated            | `number` | Number of objects being validated. The sum of beingValidatedForDispatch and beingValidatedForReturn      |
| beingValidatedForDispatch | `number` | Number of objects being validated before attempting to dispatch to a request                             |
| beingValidatedForReturn   | `number` | Number of objects being validated before being returned to available objects                             |
| pendingRequests           | `number` | Number of requests waiting for an object                                                                 |
| borrowed                  | `number` | Number of objects currently borrowed                                                                     |
| notBorrowed               | `number` | Number of objects not currently borrowed                                                                 |
| size                      | `number` | Total number of objects in the pool. Includes objects being created and excludes objects being destroyed |
| state                     | `string` | The current pool state                                                                                   |

# Pool Events

# Factory

# Idle Objects

# Custom Queue Implementations

# Testing

# Benchmarks

# Credits

Thingy Pool was heavily inspired by [Generic Pool](https://www.npmjs.com/package/generic-pool). Thanks to [@coopernurse](https://github.com/coopernurse) and everyone that has contributed to the project.

Thanks [@vitomilana](https://github.com/vitomilana) for your continued interest in the project and helping the team stay on track.

This project was a way for me to learn more about programing. I really appreciate everyone out there asking and answering questions that end up helping people they will never meet.

Special Thanks:

- [Sandi Metz](https://www.sandimetz.com/)
- [Brad Traversy](https://www.traversymedia.com/)
- [Discord.js](https://github.com/discordjs/discord.js)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [JavaScript Algorithms and Data Structures](https://github.com/trekhleb/javascript-algorithms)

The above people and repositories really helped me while working on this. I'm including them here to say thanks and maybe someone else will find them useful.

# License

Copyright 2020 [Pat Brown](https://github.com/iampatbrown)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
