const Pool = require('../');
const fetch = require('node-fetch');

class PostFetcher {
  async fetch(id) {
    const data = await fetch('https://jsonplaceholder.typicode.com/posts/' + id);
    return data.json();
  }
}

const RATE_LIMIT = 500;

const factory = {
  create: () => new PostFetcher(),
  destroy: () => true,
  validate: async () => {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT));
  },
};

const pool = new Pool(factory, { maxSize: 2, shouldValidateOnReturn: true });

const startTime = Date.now();

for (let i = 1; i < 10; i += 1) {
  pool.use(async (posts) => {
    const { id, title } = await posts.fetch(i);
    console.log(`${Date.now() - startTime}ms - PostID ${id}: ${title}`);
  });
}
