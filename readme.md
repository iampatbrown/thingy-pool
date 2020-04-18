# Thingy Pool

## About

A promise-based object pool for [Node.js](https://nodejs.org/).

## Installation

```sh
$ npm install thingy-pool
```

## Creating a factory

The factory is responsible for creating and destroying the objects you want to pool. The factory can also validate the objects if needed.

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
  validate: async api => {
    const response = await api.ping();
    const isValid = response && response.time < 200;
    return isValid;
  },
};
```

## Creating a pool

See [Options](#Options) for a complete list of options

```js
const Pool = require('thingy-pool');
const factory = require('./myObjectFactory');

const options = { minSize: 2, maxSize: 5, shouldValidateOnDispatch: true };
const pool = new Pool(factory, options);
```

## Using the pool

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

Objects must be released back to the pool after they are used. Alternatively, pool.use() can be passed a callback.

```js
async function fetchAndPrint(something) {
  const result = await pool.use(thingy => thingy.fetch(something));
  console.log(`fetched ${something}: ${result}`);
}

fetchAndPrint('something'); // fetched something: result
fetchAndPrint('somethingElse'); // fetched somethingElse: result
```

## Options

| Property                 |      Type      | Default | Description                                                                                                                                          |
| ------------------------ | :------------: | :-----: | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| minSize                  |     number     |   `0`   | The minimum number of objects the pool will try to maintain including borrowed objects                                                               |
| maxSize                  |     number     |   `1`   | The maximum number of objects the pool can manage including objects being created                                                                    |
| defaultTimeoutInMs       | number \| null | `30000` | The default time in milliseconds requests for objects will time out                                                                                  |
| maxPendingRequests       | number \| null | `null`  | The number of requests that can be queued if the pool is at the maximum size and has no objects available                                            |
| idleCheckIntervalInMs    | number \| null | `null`  | The interval the pool checks for and removes idle objects. Requires `softIdleTimeInMs` or `hardIdleTimeInMs`                                         |
| maxIdleToRemove          | number \| null | `null`  | The max objects that can be removed each time the pool checks for idle objects. `null` will check all objects                                        |
| softIdleTimeInMs         | number \| null | `null`  | The amount of time an object must be idle before being eligible for soft removal. Will not remove object if available objects is at or below minSize |
| hardIdleTimeInMs         | number \| null | `null`  | The amount of time an object must be idle before being eligible for hard removal. Removes object regardless of minSize                               |
| shouldAutoStart          |    boolean     | `true`  | Should the pool start creating objects to reach the minimum size as soon as it is created?                                                           |
| shouldValidateOnDispatch |    boolean     | `false` | Should the pool check objects with factory.validate before dispatching them to requests?                                                             |
| shouldValidateOnReturn   |    boolean     | `false` | Should the pool check objects with factory.validate when they are being returned?                                                                    |
| shouldUseFifo            |    boolean     | `true`  | Should the pool dispatch objects using first in first out (FIFO)?                                                                                    |

Options with type `number` must be positive integers with the exception of `minSize` and `maxPendingRequests` which also accept `0`. Think of `null` more like `None`. This is mainly to distinguish between `maxPendingRequests: null` which does not limit pending requests and `maxPendingRequests: 0` which will reject requests if there a no objects available and no additional objects can be created. Not sure if that's useful...

## Pool Methods

### pool.acquire(options?) → {Promise\<T>}

Request an object from the Pool. If no objects are available and the pool is below the maximum size, a new one will be created

| Parameter           |      Type      | Default | Description                                                                 |
| ------------------- | :------------: | :-----: | --------------------------------------------------------------------------- |
| options.priority    |     number     |   `0`   | The priority for the request. The higher the number the higher the priority |
| options.timeoutInMs | number \| null | `30000` | Time in milliseconds before the request times out                           |

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

### pool.on(event, callback) → {this}

| Parameter |           Type            | Description                                          |
| --------- | :-----------------------: | ---------------------------------------------------- |
| event     | [PoolEvent](#Pool-Events) | The name of the event to listen for                  |
| callback  |         function          | A function that can take the argument from the event |

```js
pool.on('poolDidStart', () => console.log('The pool has started!'));
pool.on('poolDidStop', () => console.log('The pool has stopped!'));
```

This is how you could stop the pool if the factory isn't creating objects correctly

```js
let createErrorCount = 0;

function handleFactoryCreateError(error) {
  console.warn('An error occurred while trying to create an object');
  console.log(error);
  createErrorCount += 1;
  if (createErrorCount > 5) {
    console.error('Too many creation errors. Stopping the pool!');
    pool.stop();
  }
}

pool.on('factoryCreateError', handleFactoryCreateError);
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

| Parameter           |      Type      | Default | Description                                                                 |
| ------------------- | :------------: | :-----: | --------------------------------------------------------------------------- |
| callback            |    function    |         | A function that takes a pooled object as an argument                        |
| options.priority    |     number     |   `0`   | The priority for the request. The higher the number the higher the priority |
| options.timeoutInMs | number \| null | `30000` | Time in milliseconds before the request times out                           |

```js
const something = await pool.use(thingy => thingy.fetch('something'));
console.log(`I fetched ${something}`);

// or

pool.use(async thingy => {
  const something = await thingy.fetch('something');
  console.log(`I fetched ${something}`);
});

// with custom options
const something = await pool.use(thingy => thingy.fetch('something'), { priority: 10, timeoutInMs: 1000 });
console.log(`I fetched ${something}`);
```

## Pool Info

```js
const poolInfo = pool.getInfo();
```

| Property                  |  Type  | Description                                                                                              |
| ------------------------- | :----: | -------------------------------------------------------------------------------------------------------- |
| available                 | number | Number of objects that are available for requests                                                        |
| beingCreated              | number | Number of objects being created                                                                          |
| beingDestroyed            | number | Number of objects being destroyed. Not included in the total pool size                                   |
| beingValidated            | number | Number of objects being validated. The sum of beingValidatedForDispatch and beingValidatedForReturn      |
| beingValidatedForDispatch | number | Number of objects being validated before attempting to dispatch to a request                             |
| beingValidatedForReturn   | number | Number of objects being validated before being returned to available objects                             |
| pendingRequests           | number | Number of requests waiting for an object                                                                 |
| borrowed                  | number | Number of objects currently borrowed                                                                     |
| notBorrowed               | number | Number of objects not currently borrowed                                                                 |
| size                      | number | Total number of objects in the pool. Includes objects being created and excludes objects being destroyed |
| state                     | string | The current pool state                                                                                   |

## Pool Events

The pool is an event emitter and can emit the following events:

| Name                 | Arguments | Description                                                                                |
| -------------------- | :-------: | ------------------------------------------------------------------------------------------ |
| factoryCreateError   |  `error`  | An error ocurred while trying to create an object. Likely an error from factory.create     |
| factoryDestroyError  |  `error`  | An error ocurred while trying to destroy an object. Likely an error from factory.destroy   |
| factoryValidateError |  `error`  | An error ocurred while trying to validate an object. Likely an error from factory.validate |
| poolDidStart         |           | Pool has started and initial objects have been created to reach the minimum pool size      |
| poolDidStop          |           | Pool has stopped and all objects have been destroyed                                       |

## Credits

Thingy Pool was heavily inspired by [Generic Pool](https://www.npmjs.com/package/generic-pool). Thanks to [@coopernurse](https://github.com/coopernurse) and everyone that has contributed.

Thanks [@vitomilana](https://github.com/vitomilana) for your continued interest in this project and helping the team stay on track.

I built this as a way to learn more about programing. I really appreciate everyone out there asking and answering questions that are helping people they will never meet.

Special Thanks:

- [Sandi Metz](https://www.sandimetz.com/)
- [Brad Traversy](https://www.traversymedia.com/)
- [Discord.js](https://github.com/discordjs/discord.js)
- [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- [JavaScript Algorithms and Data Structures](https://github.com/trekhleb/javascript-algorithms)

The above people and repositories really helped me while working on this. I'm including them to say thanks and maybe someone else will find them useful.

## License

Copyright 2020 [Pat Brown](https://github.com/iampatbrown)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
