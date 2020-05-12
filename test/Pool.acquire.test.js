const { TimeoutError, ErrorMessages } = require('../src/errors');
const { setupForTests, setupForTestsAsync, flushPromises } = require('./helpers');

describe('Pool.acquire', () => {
  it('should return a promise', () => {
    const { pool } = setupForTests();
    expect(pool.acquire()).toBeInstanceOf(Promise);
  });

  it('should start the pool if not started', () => {
    const { pool } = setupForTests({ shouldAutoStart: false });
    expect(pool.getState()).toBe('CREATED');
    pool.acquire();
    expect(pool.getState()).toBe('STARTING');
  });

  it('should resolve to a object from the pool', async () => {
    expect.assertions(3);
    const { pool, factory } = await setupForTestsAsync();
    const object = await pool.acquire();
    expect(factory.created).toContain(object);
    expect(pool.has(object)).toBe(true);
    expect(pool.isBorrowed(object)).toBe(true);
  });

  it('should reject if pool is shutting down', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync();
    pool.stop();
    expect(pool.getState()).toBe('SHUTTING_DOWN');
    try {
      await pool.acquire();
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toEqual(ErrorMessages.IS_SHUTTING_DOWN);
    }
  });

  it('should reject if pool is stopped', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync();
    await pool.stop();
    expect(pool.getState()).toBe('STOPPED');
    try {
      await pool.acquire();
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toEqual(ErrorMessages.IS_STOPPED);
    }
  });

  it('should timeout if factory cant create object', async () => {
    expect.assertions(1);
    const { pool, factoryCreate } = setupForTests({ shouldAutoStart: false });
    factoryCreate.mockImplementation(() => false);
    await expect(pool.acquire({ timeoutInMs: 50 })).rejects.toThrow(TimeoutError);
  }, 1000);

  it('should timeout if factory cant validate object', async () => {
    expect.assertions(1);
    const { pool, factoryValidate } = await setupForTestsAsync({
      factoryTaskIntervalInMs: 0,
      minSize: 1,
      shouldValidateOnDispatch: true,
    });
    factoryValidate.mockImplementation(() => false);
    await expect(pool.acquire({ timeoutInMs: 50 })).rejects.toThrow(TimeoutError);
  }, 1000);

  it('should resolve in order', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ maxSize: 10 });
    const resolved = [];
    const requests = [...Array(6)].map(() => pool.acquire());
    requests.forEach((request, index) => {
      request.then(() => resolved.push(index));
    });
    await Promise.all(requests);
    expect(resolved).toHaveLength(6);
    expect(resolved).toEqual([...resolved].sort());
  });

  it('should resolve by given priority', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ maxSize: 10 });
    const priorities = [0, 5, 2, 15, 11, 100];
    const resolved = [];
    const requests = priorities.map(priority => {
      const request = pool.acquire({ priority });
      request.then(() => resolved.push(priority));
      return request;
    });
    await Promise.all(requests);
    expect(resolved).toHaveLength(6);
    expect(resolved).toEqual([...priorities].sort((a, b) => b - a));
  });

  it('should use default timeout for acquire', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ defaultTimeoutInMs: 5000 });
    jest.useFakeTimers();
    pool.acquire();
    expect(setTimeout).toBeCalledWith(expect.any(Function), 5000);
    jest.useRealTimers();
  });

  it('should use overwrite default timeout', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ defaultTimeoutInMs: 5000 });
    jest.useFakeTimers();
    pool.acquire({ timeoutInMs: 1000 });
    expect(setTimeout).toBeCalledWith(expect.any(Function), 1000);
    jest.useRealTimers();
  });

  it('should timeout if no objects available', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ maxSize: 1 });
    pool.acquire();
    try {
      await pool.acquire({ timeoutInMs: 50 });
    } catch (error) {
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toEqual(ErrorMessages.REQUEST_DID_TIMEOUT);
    }
  });

  it('should timeout if pool does not create object in time', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync({ factoryTaskIntervalInMs: 300 });
    try {
      await pool.acquire({ timeoutInMs: 50 });
    } catch (error) {
      expect(pool.getInfo().beingCreated).toBe(1);
      expect(error).toBeInstanceOf(TimeoutError);
      expect(error.message).toEqual(ErrorMessages.REQUEST_DID_TIMEOUT);
    }
  });

  it('should reject if pool has max requests', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync({ maxSize: 1, maxPendingRequests: 1 });
    pool.acquire();
    expect(pool.getInfo().pendingRequests).toBe(1);
    try {
      await pool.acquire();
    } catch (error) {
      expect(error).toBeInstanceOf(RangeError);
      expect(error.message).toEqual(ErrorMessages.MAX_REQUESTS);
    }
  });

  it('should retry next loop before rejecting due to max requests', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync({ minSize: 1, maxPendingRequests: 0 });
    const object1 = await pool.acquire();
    expect(pool.getInfo().available).toBe(0);
    const promise = pool.acquire();
    expect(pool.getInfo().pendingRequests).toBe(1);
    pool.release(object1);
    const object2 = await promise;
    expect(object2).toBe(object1);
  });

  it('should retry next loop before rejecting due to pool shutting down', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync({ maxSize: 1, maxPendingRequests: 0 });
    const promise1 = pool.acquire();
    expect(pool.getInfo().pendingRequests).toBe(1);
    const promise2 = pool.acquire();
    pool.stop();
    await expect(promise2).rejects.toThrow(ErrorMessages.IS_SHUTTING_DOWN);
    await expect(promise1).resolves.toEqual({ id: 0 });
  });

  it.each([1, 2, 3, 4, 5, 7, 8, 10])(
    'should increase pool size to fullfil all requests if below max (%i)',
    async maxSize => {
      const numOfRequests = 20;
      expect.assertions(numOfRequests);
      const { pool } = await setupForTestsAsync({ maxSize });
      for (let i = 0; i < numOfRequests; i += 1) {
        pool.acquire();
        const expectedSize = i < maxSize ? i + 1 : maxSize;
        expect(pool.getSize()).toBe(expectedSize);
      }
    },
  );

  describe('options.shouldUseFifo = true', () => {
    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should resolve to the oldest created object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize });
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.acquire()).resolves.toBe(factory.created[0]);
    });

    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should resolve to the oldest returned object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize });
      const objects = await Promise.all([...Array(minSize)].map(() => pool.acquire()));
      const toReturn = objects.slice(0, minSize / 2 + 1);
      toReturn.forEach(object => pool.release(object));
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.acquire()).resolves.toBe(toReturn[0]);
    });
  });

  describe('options.shouldUseFifo = false', () => {
    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should resolve to the most recently created object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize, shouldUseFifo: false });
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.acquire()).resolves.toBe(factory.created[minSize - 1]);
    });

    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should resolve to the most recently returned object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize, shouldUseFifo: false });
      const objects = await Promise.all([...Array(minSize)].map(() => pool.acquire()));
      const toReturn = objects.slice(0, minSize / 2 + 1);
      toReturn.forEach(object => pool.release(object));
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.acquire()).resolves.toBe(toReturn.reverse()[0]);
    });
  });

  describe('options.shouldValidateOnDispatch = false', () => {
    it('should dispatch without running validation', async () => {
      expect.assertions(10);
      const { pool, factory } = await setupForTestsAsync({
        minSize: 10,
        shouldValidateOnDispatch: false,
      });
      const factoryValidate = jest.spyOn(factory, 'validate');
      for (let i = 0; i < 10; i += 1) {
        expect(factoryValidate).toBeCalledTimes(0);
        pool.acquire();
      }
    });
  });

  describe('options.shouldValidateOnDispatch = true', () => {
    it('should validate on dispatch', async () => {
      expect.assertions(20);
      const { pool, factory } = await setupForTestsAsync({
        minSize: 10,
        shouldValidateOnDispatch: true,
      });
      const factoryValidate = jest.spyOn(factory, 'validate');
      for (let i = 0; i < 10; i += 1) {
        pool.acquire();
        expect(factoryValidate).toBeCalledTimes(i + 1);
        expect(factoryValidate).toBeCalledWith(factory.created[i]);
      }
    });

    it('should destroy objects that fail validation', async () => {
      expect.assertions(5);
      const { pool, factory } = await setupForTestsAsync({
        minSize: 10,
        shouldValidateOnDispatch: true,
      });
      const factoryDestroy = jest.spyOn(factory, 'destroy');
      const shouldBeDestroyed = [2, 5, 6, 8].map(id => {
        const object = factory.created[id];
        object.shouldFailValidate = true;
        return object;
      });
      await Promise.all([...Array(10)].map(() => pool.acquire()));
      expect(factoryDestroy).toBeCalledTimes(4);
      shouldBeDestroyed.forEach((object, index) => {
        expect(factoryDestroy).nthCalledWith(index + 1, object);
      });
    });

    it('should dispatch to subsequent acquire if original acquire times out while validating', async () => {
      expect.assertions(6);
      const { pool, factory } = await setupForTestsAsync({
        factoryTaskIntervalInMs: 10,
        minSize: 3,
        shouldValidateOnDispatch: true,
      });
      const factoryValidate = jest.spyOn(factory, 'validate');
      const request = pool.acquire({ timeoutInMs: 1 });
      expect(factoryValidate).toBeCalledTimes(1);
      expect(pool.getInfo().beingValidated).toBe(1);
      try {
        await request;
      } catch (error) {
        expect(error).toBeInstanceOf(TimeoutError);
        expect(pool.getInfo().beingValidatedForDispatch).toBe(1);
        const object = await pool.acquire();
        expect(factoryValidate).toBeCalledTimes(1);
        expect(factoryValidate).toBeCalledWith(object);
      }
    });

    it('should return object if request timesout before validation completes', async () => {
      expect.assertions(7);
      const { pool, factoryValidate } = await setupForTestsAsync({
        factoryTaskIntervalInMs: 10,
        minSize: 1,
        shouldValidateOnDispatch: true,
      });
      const request = pool.acquire({ timeoutInMs: 1 });
      expect(factoryValidate).toBeCalledTimes(1);
      expect(pool.getInfo().beingValidated).toBe(1);
      await expect(request).rejects.toThrow(TimeoutError);
      expect(pool.getInfo().available).toBe(0);
      expect(pool.getInfo().beingValidatedForDispatch).toBe(1);
      await factoryValidate.mock.results[0].value; //?
      await flushPromises();
      expect(pool.getInfo().available).toBe(1);
      expect(pool.getInfo().beingValidatedForDispatch).toBe(0);
    });
  });
});
