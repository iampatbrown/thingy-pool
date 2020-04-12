# Thingy Pool

> Object pool for node inspired by [Generic Pool](https://github.com/coopernurse/node-pool)

## About

Object pool inspired by

## Installation

```sh
$ npm install thingy-pool
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
