const PoolOptions = require('../src/PoolOptions');

const defaults = new PoolOptions();

describe('PoolOptions.constructor', () => {
  it('should create PoolOptions with defaults', () => {
    expect(new PoolOptions()).toEqual(defaults);
  });

  it('should merge given options with defaults', () => {
    const given = { minSize: 3, maxSize: 10 };
    const expected = { ...defaults, ...given };
    expect(new PoolOptions(given)).toEqual(expected);
  });

  it('should reject unknown options', () => {
    const given = { minSize: 3, maxSize: 10, unknownOption: 100 };
    expect(() => new PoolOptions(given)).toThrow(ReferenceError);
  });

  it('should ignore given options that are undefined', () => {
    const given = { minSize: undefined, maxSize: 10 };
    const expected = { ...defaults, maxSize: 10 };
    expect(new PoolOptions(given)).toEqual(expected);
  });
});

describe('PoolOptions.minSize', () => {
  it('should be a positive integer or zero', () => {
    expect(new PoolOptions({ minSize: 0 }).minSize).toBe(0);
    expect(new PoolOptions({ minSize: 1 }).minSize).toBe(1);
    expect(new PoolOptions({ minSize: '0' }).minSize).toBe(0);
    expect(new PoolOptions({ minSize: '9.5' }).minSize).toBe(9);
    expect(() => new PoolOptions({ minSize: -2 })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: '-8' })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: null })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: true })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: false })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: {} })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: [] })).toThrow(TypeError);
  });

  it('should increase maxSize to minSize if no maxSize is given', () => {
    expect(new PoolOptions({ minSize: 5 }).maxSize).toBe(5);
    expect(new PoolOptions({ minSize: '8' }).maxSize).toBe(8);
  });

  it('should throw if given minSize is greater than given maxSize', () => {
    expect(new PoolOptions({ minSize: 5, maxSize: 5 }).minSize).toBe(5);
    expect(() => new PoolOptions({ minSize: 5, maxSize: 4 })).toThrow(RangeError);
  });
});

describe('PoolOptions.maxSize', () => {
  it('should be a positive integer', () => {
    expect(new PoolOptions({ maxSize: 1 }).maxSize).toBe(1);
    expect(new PoolOptions({ maxSize: 3.5 }).maxSize).toBe(3);
    expect(new PoolOptions({ maxSize: '1' }).maxSize).toBe(1);
    expect(new PoolOptions({ maxSize: '9.5' }).maxSize).toBe(9);
    expect(() => new PoolOptions({ maxSize: 0 })).toThrow(TypeError);
    expect(() => new PoolOptions({ maxSize: '-8' })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: null })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: true })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: false })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: {} })).toThrow(TypeError);
    expect(() => new PoolOptions({ minSize: [] })).toThrow(TypeError);
  });

  it('should throw if given maxSize is less than given minSize', () => {
    expect(new PoolOptions({ minSize: 5, maxSize: 5 }).maxSize).toBe(5);
    expect(() => new PoolOptions({ minSize: 5, maxSize: 4 })).toThrow(RangeError);
  });
});

describe('PoolOptions.maxPendingRequests', () => {
  it('should be a positive integer, zero or null', () => {
    expect(new PoolOptions({ maxPendingRequests: 0 }).maxPendingRequests).toBe(0);
    expect(new PoolOptions({ maxPendingRequests: 3.5 }).maxPendingRequests).toBe(3);
    expect(new PoolOptions({ maxPendingRequests: '0' }).maxPendingRequests).toBe(0);
    expect(new PoolOptions({ maxPendingRequests: '9.5' }).maxPendingRequests).toBe(9);
    expect(new PoolOptions({ maxPendingRequests: null }).maxPendingRequests).toBe(null);
    expect(new PoolOptions({ maxPendingRequests: false }).maxPendingRequests).toBe(null);
    expect(() => new PoolOptions({ maxPendingRequests: -2 })).toThrow(TypeError);
    expect(() => new PoolOptions({ maxPendingRequests: '-8' })).toThrow(TypeError);
    expect(() => new PoolOptions({ maxPendingRequests: true })).toThrow(TypeError);
    expect(() => new PoolOptions({ maxPendingRequests: {} })).toThrow(TypeError);
    expect(() => new PoolOptions({ maxPendingRequests: [] })).toThrow(TypeError);
  });
});

describe.each(['defaultTimeoutInMs', 'evictionIntervalInMs', 'testsPerEviction', 'minIdleTime', 'maxIdleTime'])(
  'PoolOptions.%s',
  option => {
    it('should be a positive integer, zero or null', () => {
      expect(new PoolOptions({ [option]: 1 })[option]).toBe(1);
      expect(new PoolOptions({ [option]: 3.5 })[option]).toBe(3);
      expect(new PoolOptions({ [option]: '1' })[option]).toBe(1);
      expect(new PoolOptions({ [option]: '9.5' })[option]).toBe(9);
      expect(new PoolOptions({ [option]: null })[option]).toBe(null);
      expect(new PoolOptions({ [option]: false })[option]).toBe(null);
      expect(() => new PoolOptions({ [option]: '-8' })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: -2 })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: true })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: {} })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: [] })).toThrow(TypeError);
    });
  },
);

describe.each(['shouldAutoStart', 'shouldValidateOnDispatch', 'shouldValidateOnReturn', 'shouldUseFifo'])(
  'PoolOptions.%s',
  option => {
    it('should be a boolean', () => {
      expect(new PoolOptions({ [option]: 1 })[option]).toBe(true);
      expect(new PoolOptions({ [option]: 0 })[option]).toBe(false);
      expect(new PoolOptions({ [option]: '1' })[option]).toBe(true);
      expect(new PoolOptions({ [option]: '0' })[option]).toBe(false);
      expect(new PoolOptions({ [option]: true })[option]).toBe(true);
      expect(new PoolOptions({ [option]: false })[option]).toBe(false);
      expect(() => new PoolOptions({ [option]: 2 })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: null })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: {} })).toThrow(TypeError);
      expect(() => new PoolOptions({ [option]: [] })).toThrow(TypeError);
    });
  },
);

describe('PoolOptions.evictionIntervalInMs', () => {
  it('should throw if eviction enabled without any Idle Time set', () => {
    expect(() => new PoolOptions({ evictionIntervalInMs: 1, minIdleTime: null, maxIdleTime: null })).toThrow(
      ReferenceError,
    );
  });
});
