const { setupForTestsAsync } = require('./helpers');

describe('Pool.release', () => {
  it('should return a true if given a pooled object that is borrowed', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ minSize: 1 });
    const object = await pool.acquire();
    expect(pool.isBorrowed(object)).toBe(true);
  });
  it('should return a false if given a pooled object that is not borrowed', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ minSize: 1 });
    const object = await pool.acquire();
    pool.release(object);
    expect(pool.isBorrowed(object)).toBe(false);
  });
  it('should return a false if given an object that is not part of the pool', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ minSize: 1 });
    expect(pool.isBorrowed({})).toBe(false);
  });
});
