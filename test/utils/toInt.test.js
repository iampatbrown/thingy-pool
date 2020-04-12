const { toInt } = require('../../src/utils');

const { MIN_SAFE_INTEGER, MAX_SAFE_INTEGER } = Number;

describe('toInt', () => {
  it.each([
    [1, 1],
    [-1, -1],
    [0, 0],
    [1, '1'],
    [-1, '-1'],
    [0, '0'],
    [0, 0.1],
    [0, 0.9],
    [0, '0.9'],
    [0, '0.1'],
    [1, 1.1],
    [1, 1.9],
    [1, '1.1'],
    [1, '1.9'],
    [-1, -1.1],
    [-1, -1.9],
    [-1, '-1.1'],
    [-1, '-1.9'],
    [MIN_SAFE_INTEGER, MIN_SAFE_INTEGER],
    [MAX_SAFE_INTEGER, MAX_SAFE_INTEGER],
  ])('should return %i when given %p', (expected, value) => {
    expect(toInt(value, 'value')).toBe(expected);
  });

  it.each([true, false, null, [], () => {}, {}, undefined])('should throw when given %p', value => {
    expect(() => toInt(value, 'value')).toThrow(TypeError);
    expect(() => toInt(value, 'value')).toThrow('value');
  });

  it('should throw when number is not a safe integer', () => {
    expect(() => toInt(MIN_SAFE_INTEGER - 1, 'value')).toThrow(TypeError);
    expect(() => toInt(MAX_SAFE_INTEGER + 1, 'value')).toThrow(TypeError);
  });

  it('should work with custom range', () => {
    expect(toInt(8, 'value', { min: 5, max: 10 })).toBe(8);
    expect(toInt(-3, 'value', { min: -3, max: 8 })).toBe(-3);
    expect(toInt(8, 'value', { min: -3, max: 8 })).toBe(8);
  });

  it('should throw when number is not within custom range', () => {
    expect(() => toInt(8, 'value', { min: 10 })).toThrow(TypeError);
    expect(() => toInt(-3, 'value', { min: -2 })).toThrow(TypeError);
    expect(() => toInt(8, 'value', { max: 7 })).toThrow(TypeError);
  });
});
