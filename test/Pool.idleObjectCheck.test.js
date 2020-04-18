const { setupForTestsAsync, flushPromises } = require('./helpers');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const setupForEviction = async (idleCheckIntervalInMs, maxIdleToRemove, softIdleTimeInMs, hardIdleTimeInMs) => {
  let now = 0;
  const getTimestamp = jest.fn().mockImplementation(() => now);

  const advanceTimeBy = ms => {
    for (let i = 0; i < ms; i += 1) {
      now += 1;
      jest.advanceTimersByTime(1);
    }
    return flushPromises();
  };

  const { pool, ...rest } = await setupForTestsAsync({
    idleCheckIntervalInMs,
    maxIdleToRemove,
    softIdleTimeInMs,
    hardIdleTimeInMs,
    maxSize: 6,
    minSize: 2,
    factoryTaskIntervalInMs: 0,
    getTimestamp,
  });
  const objects = await Promise.all([...Array(6)].map(() => pool.use(object => object)));
  return { pool, objects, advanceTimeBy, ...rest };
};

describe('Pool.eviction', () => {
  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: 1, softIdleTimeInMs: null, hardIdleTimeInMs: 8 }', () => {
    it.each([
      [0, 5],
      [1, 10],
      [2, 15],
      [3, 20],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, 1, null, 8);
      advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });

  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: 2, softIdleTimeInMs: null, hardIdleTimeInMs: 8 }', () => {
    it.each([
      [0, 5],
      [2, 10],
      [4, 15],
      [6, 20],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, 2, null, 8);
      advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });

  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: 3, softIdleTimeInMs: null, hardIdleTimeInMs: 12 }', () => {
    it.each([
      [0, 5],
      [0, 10],
      [3, 15],
      [6, 20],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, 3, null, 12);
      advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });

  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: 2, softIdleTimeInMs: 8, hardIdleTimeInMs: null }', () => {
    it.each([
      [0, 5],
      [2, 10],
      [4, 15],
      [4, 20],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, 2, 8, null);
      advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });

  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: 2, softIdleTimeInMs: 8, hardIdleTimeInMs: 16 }', () => {
    it.each([
      [0, 5],
      [2, 10],
      [4, 15],
      [6, 20],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, 2, 8, 16);
      await advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });

  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: null, softIdleTimeInMs: 8, hardIdleTimeInMs: 16 }', () => {
    it.each([
      [0, 5],
      [4, 10],
      [4, 15],
      [6, 20],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, null, 8, 16);
      await advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });

  describe('when { idleCheckIntervalInMs: 5, maxIdleToRemove: null, softIdleTimeInMs: null, hardIdleTimeInMs: 8 }', () => {
    it.each([
      [0, 5],
      [6, 10],
      [6, 15],
    ])('should have evicted %i objects after %i milliseconds', async (expected, ms) => {
      const { factory, advanceTimeBy } = await setupForEviction(5, null, null, 8);
      await advanceTimeBy(ms);
      expect(factory.destroyed).toHaveLength(expected);
    });
  });
});
