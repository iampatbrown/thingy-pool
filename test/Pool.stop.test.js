const { ErrorMessages } = require('../src/errors');
const { PoolEvents } = require('../src/constants');
const { setupForTestsAsync } = require('./helpers');

describe('Pool.stop', () => {
  it('should return a promise', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync();
    expect(pool.stop()).toBeInstanceOf(Promise);
  });

  it('should return the same promise if called multiple times', async () => {
    expect.assertions(1);
    const { pool } = await setupForTestsAsync();
    expect(pool.stop()).toBe(pool.stop());
  });

  it('should change state to shutting down', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync();
    expect(pool.getState()).toBe('STARTED');
    pool.stop();
    expect(pool.getState()).toBe('SHUTTING_DOWN');
  });

  it('should change state to stopped', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync();
    expect(pool.getState()).toBe('STARTED');
    await pool.stop();
    expect(pool.getState()).toBe('STOPPED');
  });

  it('should unschedule the evictor if enabled', async () => {
    expect.assertions(3);
    jest.useFakeTimers();
    const { pool } = await setupForTestsAsync({ checkIdleIntervalInMs: 10 });
    const { value: timeoutId } = setTimeout.mock.results[0];
    expect(clearTimeout).not.toBeCalled();
    pool.stop();
    expect(clearTimeout).toBeCalledTimes(1);
    expect(clearTimeout).toBeCalledWith(timeoutId);
    jest.useRealTimers();
  });

  it('should wait for all existing requests to be filled and returned', async () => {
    expect.assertions(4);
    const { pool } = await setupForTestsAsync({ maxSize: 1 });
    const requests = [...Array(5)].map(() => pool.acquire());
    pool.stop();
    const onlyObject = await requests.shift();
    expect(pool.getState()).toBe('SHUTTING_DOWN');
    expect(pool.getInfo().pendingRequests).toBe(4);
    requests.forEach(request => request.then(object => pool.release(object)));
    pool.release(onlyObject);
    await pool.stop();
    expect(pool.getInfo().pendingRequests).toBe(0);
    expect(pool.getState()).toBe('STOPPED');
  });

  it('should destroy any available objects after all requests filled', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync({ minSize: 5 });
    const requests = [...Array(3)].map(() => pool.acquire());
    pool.stop();
    await Promise.all(requests);
    expect(pool.getSize()).toBe(3);
    expect(pool.getInfo().beingDestroyed).toBe(2);
  });

  it('should wait for all objects to be returned and destroyed', async () => {
    expect.assertions(2);
    const { pool, factory } = await setupForTestsAsync({ minSize: 5 });
    const objects = [];
    for (let i = 0; i < 5; i += 1) {
      pool.acquire().then(object => {
        objects.push(object);
        pool.release(object);
      });
    }
    await pool.stop();
    expect(factory.destroyed).toEqual(objects);
    expect(factory.destroyed).toHaveLength(5);
  });

  it('should emit pool stopped event when stopped', async () => {
    expect.assertions(2);
    const { pool } = await setupForTestsAsync();
    const didStop = jest.fn();
    pool.on(PoolEvents.STOPPED, didStop);
    await pool.stop();
    expect(didStop).toBeCalledTimes(1);
    await pool.stop();
    expect(didStop).toBeCalledTimes(1);
  });

  it('should reject if pool is not started', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync({ shouldAutoStart: false });
    try {
      await pool.stop();
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toEqual(ErrorMessages.POOL_NOT_STARTED);
      expect(pool.getState()).toBe('CREATED');
    }
  });
});
