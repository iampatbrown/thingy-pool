const { toBoolean } = require('../../src/utils');

describe('toBoolean', () => {
  it.each([true, 1, '1'])('should return false when given %p', value => {
    expect(toBoolean(value, 'value')).toBe(true);
  });

  it.each([false, 0, '0'])('should return false when given %p', value => {
    expect(toBoolean(value, 'value')).toBe(false);
  });

  it.each([null, 2, 'string', [], () => {}, {}, undefined])('should throw when given %p', value => {
    expect(() => toBoolean(value, 'value')).toThrow(TypeError);
    expect(() => toBoolean(value, 'value')).toThrow('value');
  });
});
