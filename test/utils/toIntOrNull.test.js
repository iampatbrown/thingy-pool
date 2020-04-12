const { toNullableInt } = require('../../src/utils');

const { MIN_SAFE_INTEGER, MAX_SAFE_INTEGER } = Number;

describe('toNullableInt', () => {
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
    [null, null],
    [null, false],
    [MIN_SAFE_INTEGER, MIN_SAFE_INTEGER],
    [MAX_SAFE_INTEGER, MAX_SAFE_INTEGER],
  ])('should return %p when given %p', (expected, value) => {
    expect(toNullableInt(value, 'value')).toBe(expected);
  });

  it.each([true, [], () => {}, {}, undefined])('should throw when given %p', value => {
    expect(() => toNullableInt(value, 'value')).toThrow(TypeError);
    expect(() => toNullableInt(value, 'value')).toThrow('value');
  });

  it('should throw when number is not a safe integer', () => {
    expect(() => toNullableInt(MIN_SAFE_INTEGER - 1, 'value')).toThrow(TypeError);
    expect(() => toNullableInt(MAX_SAFE_INTEGER + 1, 'value')).toThrow(TypeError);
  });

  it('should work with custom range', () => {
    expect(toNullableInt(8, 'value', { min: 5, max: 10 })).toBe(8);
    expect(toNullableInt(-3, 'value', { min: -3, max: 8 })).toBe(-3);
    expect(toNullableInt(8, 'value', { min: -3, max: 8 })).toBe(8);
  });

  it('should throw when number is not within custom range', () => {
    expect(() => toNullableInt(8, 'value', { min: 10 })).toThrow(TypeError);
    expect(() => toNullableInt(-3, 'value', { min: -2 })).toThrow(TypeError);
    expect(() => toNullableInt(8, 'value', { max: 7 })).toThrow(TypeError);
  });
});
