const Pool = require('../src/Pool');
const PoolOptions = require('../src/PoolOptions');
const TestFactory = require('./helpers/TestFactory');

describe('new Pool', () => {
  it('should create a Pool with default options', () => {
    const pool = new Pool(new TestFactory());
    const defaults = new PoolOptions();
    expect(pool.getOptions()).toEqual(defaults);
  });

  it('should throw when given an invalid factory', () => {
    expect(() => new Pool()).toThrow(TypeError);
  });
});
