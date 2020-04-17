# Thingy Pool

## About

A promise-based object pool for [Node.js](https://nodejs.org/).

## Installation

```sh
$ npm install thingy-pool
```

## Creating a factory

The factory is responsible for creating and destroying the objects being pooled. The factory can also validate the objects if needed. See [Factory](./Factory.html) for a more detailed examples.

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

## Usage

```js
const Pool = require('thingy-pool');
const Thingy = require('./Thingy');

// Create a basic factory
const factory = {
  create: async () => {
    const thingy = new Thingy();
    await thingy.connect();
    return thingy;
  },
  destroy: async thingy => {
    await thingy.disconnect();
    return true;
  },
};

// Create a pool with the desired options
const pool = new Pool(factory, { maxSize: 2 });

// Use pool.acquire() to access and use your thingy
const useThingy = async () => {
  const thingy = await pool.acquire();
  const result = await thingy.doSomething();
  console.log(`${result} from ${thingy}`);
  pool.release(thingy);
};

useThingy();
useThingy();
useThingy();

pool.stop();
```

=======

# Pool

```js
const Pool = require('thingy-pool');
const Thingy = require('./Thingy');

const factory = {
  create: () => new Thingy(),
  destroy: thingy => {
    console.log(`${thingy} has been destroyed!`);
    return true;
  },
};

const pool = new Pool(factory, { maxSize: 2 });

async function useThingy() {
  const thingy = await pool.acquire();
  const result = await thingy.doSomething();
  console.log(`${result} from ${thingy}`);
  pool.release(thingy);
}

useThingy(); // result from thingy 1
useThingy();
useThingy();
pool.stop();

// thingy has been destroyed!
```
