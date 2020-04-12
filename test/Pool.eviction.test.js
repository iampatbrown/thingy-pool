const { setupForTestsAsync, flushPromises } = require('./helpers');

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

const setupForEviction = async (evictionIntervalInMs, testsPerEviction, minIdleTime, maxIdleTime) => {
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
    evictionIntervalInMs,
    testsPerEviction,
    minIdleTime,
    maxIdleTime,
    maxSize: 6,
    minSize: 2,
    factoryTaskIntervalInMs: 0,
    getTimestamp,
  });
  const objects = await Promise.all([...Array(6)].map(() => pool.use(object => object)));
  return { pool, objects, advanceTimeBy, ...rest };
};

describe('Pool.eviction', () => {
  describe('when { evictionIntervalInMs: 5, testsPerEviction: 1, minIdleTime: null, maxIdleTime: 8 }', () => {
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

  describe('when { evictionIntervalInMs: 5, testsPerEviction: 2, minIdleTime: null, maxIdleTime: 8 }', () => {
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

  describe('when { evictionIntervalInMs: 5, testsPerEviction: 3, minIdleTime: null, maxIdleTime: 12 }', () => {
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

  describe('when { evictionIntervalInMs: 5, testsPerEviction: 2, minIdleTime: 8, maxIdleTime: null }', () => {
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

  describe('when { evictionIntervalInMs: 5, testsPerEviction: 2, minIdleTime: 8, maxIdleTime: 16 }', () => {
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

  describe('when { evictionIntervalInMs: 5, testsPerEviction: null, minIdleTime: 8, maxIdleTime: 16 }', () => {
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

  describe('when { evictionIntervalInMs: 5, testsPerEviction: null, minIdleTime: null, maxIdleTime: 8 }', () => {
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
