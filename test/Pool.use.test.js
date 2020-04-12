const { ErrorMessages } = require('../src/errors');
const { setupForTests, setupForTestsAsync } = require('./helpers');

const getObjectId = object => object.id;

describe('Pool.use', () => {
  it('should return a promise', () => {
    const { pool } = setupForTests();
    expect(pool.use(getObjectId)).toBeInstanceOf(Promise);
  });

  it('should start the pool if not started', () => {
    const { pool } = setupForTests({ shouldAutoStart: false });
    expect(pool.getState()).toBe('CREATED');
    pool.use(getObjectId);
    expect(pool.getState()).toBe('STARTING');
  });

  it('should resolve to the result from the callback using a pooled object as the param', async () => {
    expect.assertions(1);
    const { pool, factory } = await setupForTestsAsync({ minSize: 1 });
    const object = factory.created[0];
    const objectId = await pool.use(getObjectId);
    expect(object.id).toBe(objectId);
  });

  it('should reject if callback is not a function', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync();
    await expect(pool.use(true)).rejects.toThrow(ErrorMessages.CALLBACK_MUST_BE_FUNCTION);
  });

  it('should reject if callback throws an error', async () => {
    expect.assertions(1);
    const { pool, callback } = await setupForTestsAsync();
    const error = new Error();
    callback.mockRejectedValue(error);
    await expect(pool.use(callback)).rejects.toThrow(error);
  });

  it('should reject if pool is shutting down', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync();
    pool.stop();
    expect(pool.getState()).toBe('SHUTTING_DOWN');
    await expect(pool.use(getObjectId)).rejects.toThrow(ErrorMessages.IS_SHUTTING_DOWN);
  });

  it('should reject if pool is stopped', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync();
    await pool.stop();
    expect(pool.getState()).toBe('STOPPED');
    await expect(pool.use(getObjectId)).rejects.toThrow(ErrorMessages.IS_STOPPED);
  });

  it('should resolve in order', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ maxSize: 10 });
    const resolved = [];
    const requests = [...Array(6)].map(() => pool.use(getObjectId));
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
      const request = pool.use(getObjectId, { priority });
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
    pool.use(getObjectId);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 5000);
    jest.useRealTimers();
  });

  it('should use overwrite default timeout', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ defaultTimeoutInMs: 5000 });
    jest.useFakeTimers();
    pool.use(getObjectId, { timeoutInMs: 1000 });
    expect(setTimeout).toBeCalledWith(expect.any(Function), 1000);
    jest.useRealTimers();
  });

  it('should timeout if no objects available', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ maxSize: 1 });
    pool.use(object => new Promise(resolve => setTimeout(() => resolve(object.id), 100)));
    await expect(pool.use(getObjectId, { timeoutInMs: 50 })).rejects.toThrow(ErrorMessages.REQUEST_DID_TIMEOUT);
  });

  it('should timeout if pool does not create object in time', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ factoryTaskIntervalInMs: 300 });
    await expect(pool.use(getObjectId, { timeoutInMs: 50 })).rejects.toThrow(ErrorMessages.REQUEST_DID_TIMEOUT);
    expect(pool.getInfo().beingCreated).toBe(1);
  });

  it('should reject if pool has max requests', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ maxSize: 1, maxPendingRequests: 0 });
    await pool.acquire();
    await expect(pool.use(getObjectId)).rejects.toThrow(ErrorMessages.MAX_REQUESTS);
  });

  it('should reject if pool has max requests', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ maxSize: 1, maxPendingRequests: 0 });
    pool.acquire();
    await expect(pool.use(getObjectId)).rejects.toThrow(ErrorMessages.MAX_REQUESTS);
  });

  it('should retry next loop instead of rejecting due to max requests', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync({ maxSize: 1, maxPendingRequests: 0 });
    const object = await pool.acquire();
    const promise = pool.use(getObjectId);
    pool.release(object);
    const objectId = await promise;
    expect(objectId).toBe(object.id);
  });

  it.each([1, 2, 3, 4, 5, 7, 8, 10])(
    'should increase pool size to fullfil all requests if below max (%i)',
    async maxSize => {
      const numOfRequests = 20;
      expect.assertions(numOfRequests);
      const { pool } = await setupForTestsAsync({ maxSize });
      for (let i = 0; i < numOfRequests; i += 1) {
        pool.use(getObjectId);
        const expectedSize = i < maxSize ? i + 1 : maxSize;
        expect(pool.getSize()).toBe(expectedSize);
      }
    },
  );

  describe('options.shouldUseFifo = true', () => {
    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should use the oldest created object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize });
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.use(getObjectId)).resolves.toBe(factory.created[0].id);
    });

    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should use the oldest returned object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize });
      const objects = await Promise.all([...Array(minSize)].map(() => pool.acquire()));
      const toReturn = objects.slice(0, minSize / 2 + 1);
      toReturn.forEach(object => pool.release(object));
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.use(getObjectId)).resolves.toBe(toReturn[0].id);
    });
  });

  describe('options.shouldUseFifo = false', () => {
    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should use the most recently created object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize, shouldUseFifo: false });
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.use(getObjectId)).resolves.toBe(factory.created[minSize - 1].id);
    });

    it.each([1, 2, 3, 4, 5, 7, 8, 10])('should use the most recently returned object (%i)', async minSize => {
      expect.assertions(2);
      const { pool, factory } = await setupForTestsAsync({ minSize, shouldUseFifo: false });
      const objects = await Promise.all([...Array(minSize)].map(() => pool.acquire()));
      const toReturn = objects.slice(0, minSize / 2 + 1);
      toReturn.forEach(object => pool.release(object));
      expect(factory.created).toHaveLength(minSize);
      await expect(pool.use(getObjectId)).resolves.toBe(toReturn.reverse()[0].id);
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
        pool.use(getObjectId);
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
        pool.use(getObjectId);
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
      await Promise.all([...Array(10)].map(() => pool.use(getObjectId)));
      expect(factoryDestroy).toBeCalledTimes(4);
      shouldBeDestroyed.forEach((object, index) => {
        expect(factoryDestroy).nthCalledWith(index + 1, object);
      });
    });

    it('should dispatch to subsequent use if original use times out while validating', async () => {
      expect.assertions(6);
      const { pool, factory } = await setupForTestsAsync({
        factoryTaskIntervalInMs: 10,
        minSize: 3,
        shouldValidateOnDispatch: true,
      });
      const factoryValidate = jest.spyOn(factory, 'validate');
      const request = pool.use(getObjectId, { timeoutInMs: 1 });
      expect(factoryValidate).toBeCalledTimes(1);
      expect(pool.getInfo().beingValidated).toBe(1);
      await expect(request).rejects.toThrow(ErrorMessages.REQUEST_DID_TIMEOUT);
      expect(pool.getInfo().beingValidated).toBe(1);
      await expect(pool.use(getObjectId)).resolves.toBe(0);
      expect(factoryValidate).toBeCalledTimes(1);
    });
  });
});
