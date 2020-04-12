const { ErrorMessages } = require('../src/errors');
const { setupForTestsAsync } = require('./helpers');

describe('Pool.release', () => {
  it('should return a promise', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();

    expect(pool.release(object)).toBeInstanceOf(Promise);
  });

  it('should reject if given object that is not part of the pool', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    await expect(pool.release({})).rejects.toThrow(ErrorMessages.NOT_IN_POOL);
  });

  it('should reject if given object already returned', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync();
    const object = await pool.acquire();
    pool.release(object);
    await expect(pool.release(object)).rejects.toThrow(ErrorMessages.CANT_RETURN_NOT_BORROWED);
  });

  it('should increase the qtyAvailable', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getInfo().available).toBe(0);
    pool.release(object);
    expect(pool.getInfo().available).toBe(1);
  });

  it('should decrease the qtyBorrowed', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getInfo().borrowed).toBe(1);
    pool.release(object);
    expect(pool.getInfo().borrowed).toBe(0);
  });

  it('should increase the qtyNotBorrowed', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getInfo().notBorrowed).toBe(0);
    pool.release(object);
    expect(pool.getInfo().notBorrowed).toBe(1);
  });

  it('should not change the size of pool', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: true });
    const object = await pool.acquire();
    expect(pool.getSize()).toBe(1);
    pool.release(object);
    expect(pool.getSize()).toBe(1);
  });

  describe('options.shouldValidateOnReturn = false', () => {
    it('should return without running validation', async () => {
      expect.assertions(2);
      const { pool, factoryValidate } = await setupForTestsAsync({
        minSize: 10,
        shouldValidateOnReturn: false,
      });
      const objects = await Promise.all([...Array(10)].map(() => pool.acquire()));
      expect(factoryValidate).toBeCalledTimes(0);
      objects.forEach(object => pool.release(object));
      expect(factoryValidate).toBeCalledTimes(0);
    });
  });

  describe('options.shouldValidateOnReturn = true', () => {
    it('should validate on return', async () => {
      expect.assertions(12);
      const { pool, factoryValidate } = await setupForTestsAsync({ minSize: 10, shouldValidateOnReturn: true });
      const objects = await Promise.all([...Array(10)].map(() => pool.acquire()));
      expect(factoryValidate).toBeCalledTimes(0);
      objects.forEach((object, index) => {
        pool.release(object);
        expect(factoryValidate).nthCalledWith(index + 1, object);
      });
      expect(pool.getInfo().beingValidatedForReturn).toBe(10);
    });

    it('should destroy objects that fail validation', async () => {
      expect.assertions(5);
      const { pool, factory, factoryDestroy } = await setupForTestsAsync({
        minSize: 10,
        shouldValidateOnReturn: true,
      });
      const shouldBeDestroyed = [3, 4, 6, 8].map(id => {
        const object = factory.created[id];
        object.shouldFailValidate = true;
        return object;
      });
      const objects = await Promise.all([...Array(10)].map(() => pool.acquire()));
      expect(factoryDestroy).toBeCalledTimes(0);
      await Promise.all(objects.map(object => pool.release(object)));
      await Promise.all([...Array(10)].map(() => pool.acquire()));
      shouldBeDestroyed.forEach((object, index) => {
        expect(factoryDestroy).nthCalledWith(index + 1, object);
      });
    });
  });
});
