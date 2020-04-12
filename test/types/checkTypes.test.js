const { checkTypes } = require('../../src/types');

describe('checkTypes', () => {
  it.each([
    ['boolean', true],
    ['boolean', false],
    ['string', 'testString'],
    ['number', 123],
    ['undefined', undefined],
  ])('should return true when expecting %s and given %p', (typeName, value) => {
    expect(checkTypes({ [typeName]: typeName }, { [typeName]: value }, 'Test')).toBe(true);
  });

  it.each([
    ['boolean', 'true'],
    ['boolean', 1],
    ['boolean', null],
    ['string', true],
    ['string', 123],
    ['number', '123'],
    ['number', true],
    ['undefined', null],
    ['undefined', 'undefined'],
  ])('should throw when expecting %s and given %p', (typeName, value) => {
    expect(() => checkTypes({ [typeName]: typeName }, { [typeName]: value }, 'Test')).toThrow(TypeError);
  });

  it('should also check [Symbol.iterator]', () => {
    expect(checkTypes({ [Symbol.iterator]: 'function' }, { [Symbol.iterator]: () => {} }, 'Test')).toBe(true);
    expect(() => checkTypes({ [Symbol.iterator]: 'function' }, { [Symbol.iterator]: true }, 'Test')).toThrow(TypeError);
  });

  it('should check multiple types when given an array of types', () => {
    expect(checkTypes({ multiple: ['function', 'undefined'] }, { multiple: () => {} }, 'Test')).toBe(true);
    expect(checkTypes({ multiple: ['function', 'undefined'] }, {}, 'Test')).toBe(true);
    expect(checkTypes({ multiple: ['string', 'number'] }, { multiple: 1 }, 'Test')).toBe(true);
    expect(checkTypes({ multiple: ['string', 'number'] }, { multiple: '1' }, 'Test')).toBe(true);
    expect(() => checkTypes({ multiple: ['function', 'undefined'] }, { multiple: null }, 'Test')).toThrow(TypeError);
    expect(() => checkTypes({ multiple: ['string', 'number'] }, { multiple: true }, 'Test')).toThrow(TypeError);
  });
});
