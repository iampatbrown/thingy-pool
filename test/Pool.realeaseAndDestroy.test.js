const { ErrorMessages } = require('../src/errors');
const { setupForTestsAsync } = require('./helpers');

describe('Pool.releaseAndDestroy', () => {
  it('should return a promise', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();

    expect(pool.releaseAndDestroy(object)).toBeInstanceOf(Promise);
  });

  it('should reject if given object that is not part of the pool', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    await expect(pool.releaseAndDestroy({})).rejects.toThrow(ErrorMessages.NOT_IN_POOL);
  });

  it('should reject if given object already returned', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync();
    const object = await pool.acquire();
    pool.release(object);
    await expect(pool.releaseAndDestroy(object)).rejects.toThrow(ErrorMessages.CANT_RETURN_NOT_BORROWED);
  });

  it('should not change the qtyAvailable', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getInfo().available).toBe(0);
    pool.releaseAndDestroy(object);
    expect(pool.getInfo().available).toBe(0);
  });

  it('should decrease the qtyBorrowed', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getInfo().borrowed).toBe(1);
    pool.releaseAndDestroy(object);
    expect(pool.getInfo().borrowed).toBe(0);
  });

  it('should not change the qtyNotBorrowed', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getInfo().notBorrowed).toBe(0);
    pool.releaseAndDestroy(object);
    expect(pool.getInfo().notBorrowed).toBe(0);
  });

  it('should decrease the size of pool', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getSize()).toBe(1);
    pool.releaseAndDestroy(object);
    expect(pool.getSize()).toBe(0);
  });

  it('should increase qty being created if pool size would go below min', async () => {
    expect.assertions(4);
    const { pool } = await setupForTestsAsync({ minSize: 1, shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getSize()).toBe(1);
    expect(pool.getInfo().beingCreated).toBe(0);
    pool.releaseAndDestroy(object);
    expect(pool.getSize()).toBe(1);
    expect(pool.getInfo().beingCreated).toBe(1);
  });
});
