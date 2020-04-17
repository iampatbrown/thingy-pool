const { ErrorMessages } = require('../src/errors');
const { PoolEvents } = require('../src/constants');
const { setupForTests, setupForTestsAsync } = require('./helpers');

describe('Pool.start', () => {
  it('should return a promise', () => {
    const { pool } = setupForTests({ shouldAutoStart: false });
    expect(pool.start()).toBeInstanceOf(Promise);
  });

  it('should return the same promise if called multiple times', () => {
    const { pool } = setupForTests({ shouldAutoStart: false });
    expect(pool.start()).toBe(pool.start());
  });

  it('should change state to starting', () => {
    const { pool } = setupForTests({ shouldAutoStart: false });
    expect(pool.getState()).toBe('CREATED');
    pool.start();
    expect(pool.getState()).toBe('STARTING');
  });

  it('should change state to started after resolving', async () => {
    expect.assertions(2);
    const { pool } = setupForTests({ shouldAutoStart: false });
    expect(pool.getState()).toBe('CREATED');
    await pool.start();
    expect(pool.getState()).toBe('STARTED');
  });

  it.each([0, 1, 2, 3, 4, 5, 7, 8, 10])('should increase size to given minimum (%i)', minSize => {
    const { pool } = setupForTests({ shouldAutoStart: false, minSize });
    expect(pool.getSize()).toBe(0);
    pool.start();
    expect(pool.getSize()).toBe(minSize);
  });

  it.each([0, 1, 2, 3, 4, 5, 7, 8, 10])('should resolve after minimum objects are created (%i)', async minSize => {
    expect.assertions(3);
    const { pool, factory } = setupForTests({ shouldAutoStart: false, minSize });
    expect(pool.getInfo().available).toBe(0);
    await pool.start();
    expect(pool.getInfo().available).toBe(minSize);
    expect(factory.created).toHaveLength(minSize);
  });

  it.each([0, 1, 2, 3, 4, 5, 7, 8, 10])(
    'should resolve before creating additional objects above minimum (%i)',
    async minSize => {
      expect.assertions(3);
      const maxSize = 10;
      const { pool, factory } = setupForTests({ shouldAutoStart: false, minSize, maxSize });
      [...Array(maxSize)].forEach(() => pool.acquire());
      expect(factory.created).toHaveLength(0);
      await pool.start();
      expect(factory.created).toHaveLength(minSize);
      expect(pool.getInfo().beingCreated).toBe(maxSize - minSize);
    },
  );

  it.each([1, 2, 3, 4, 5, 7, 8, 10])('should dispatch to pending requests (%i) while starting', async minSize => {
    expect.assertions(2);
    const maxSize = 10;
    const { pool } = setupForTests({ shouldAutoStart: false, minSize, maxSize });
    const didAcquire = jest.fn();
    [...Array(maxSize)].forEach(() => pool.acquire().then(didAcquire));
    await pool.start();
    expect(pool.getInfo().borrowed).toBe(minSize);
    expect(didAcquire).toBeCalledTimes(minSize);
  });

  it('should emit pool started event when started', async () => {
    expect.assertions(2);
    const { pool } = setupForTests({ shouldAutoStart: false });
    const didStart = jest.fn();
    pool.on(PoolEvents.STARTED, didStart);
    await pool.start();
    expect(didStart).toBeCalledTimes(1);
    await pool.start();
    expect(didStart).toBeCalledTimes(1);
  });

  it('should schedule the object evictor if enabled', async () => {
    expect.assertions(3);
    jest.useFakeTimers();
    const { pool } = setupForTests({ shouldAutoStart: false, checkIdleIntervalInMs: 10 });
    expect(setTimeout).not.toBeCalled();
    await pool.start();
    expect(setTimeout).toBeCalledTimes(1);
    expect(setTimeout).toBeCalledWith(expect.any(Function), 10);
    jest.useRealTimers();
  });

  it('should not schedule the idle object remover if disabled', async () => {
    expect.assertions(2);
    jest.useFakeTimers();
    const { pool } = setupForTests({ shouldAutoStart: false, checkIdleIntervalInMs: null });
    expect(setTimeout).not.toBeCalled();
    await pool.start();
    expect(setTimeout).not.toBeCalled();
    jest.useRealTimers();
  });

  it('should reject if pool is shutting down', async () => {
    expect.assertions(3);
    const { pool } = await setupForTestsAsync();
    pool.stop();
    expect(pool.getState()).toBe('SHUTTING_DOWN');
    try {
      await pool.start();
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
      await pool.start();
    } catch (error) {
      expect(error).toBeInstanceOf(TypeError);
      expect(error.message).toEqual(ErrorMessages.IS_STOPPED);
    }
  });
});
