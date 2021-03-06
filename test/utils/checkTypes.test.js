const { checkTypes } = require('../../src/utils');

describe('Interface', () => {
  it.each([
    ['boolean', true],
    ['boolean', false],
    ['string', 'testString'],
    ['number', 123],
    ['undefined', undefined],
  ])('should not throw when expecting %s and given %p', (typeName, value) => {
    expect(() => checkTypes({ [typeName]: typeName }, { [typeName]: value }, 'Test')).not.toThrow();
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
    expect(() => checkTypes({ [Symbol.iterator]: 'function' }, { [Symbol.iterator]: () => {} }, 'Test')).not.toThrow();
    expect(() => checkTypes({ [Symbol.iterator]: 'function' }, { [Symbol.iterator]: true }, 'Test')).toThrow(TypeError);
  });

  it('should check multiple types when given an array of types', () => {
    expect(() => checkTypes({ multiple: 'function|undefined' }, { multiple: () => {} }, 'Test')).not.toThrow();
    expect(() => checkTypes({ multiple: 'function|undefined' }, {}, 'Test')).not.toThrow();
    expect(() => checkTypes({ multiple: 'string|number' }, { multiple: 1 }, 'Test')).not.toThrow();
    expect(() => checkTypes({ multiple: 'string|number' }, { multiple: '1' }, 'Test')).not.toThrow();
    expect(() => checkTypes({ multiple: 'function|undefined' }, { multiple: null }, 'Test')).toThrow(TypeError);
    expect(() => checkTypes({ multiple: 'string|number' }, { multiple: true }, 'Test')).toThrow(TypeError);
  });
});
