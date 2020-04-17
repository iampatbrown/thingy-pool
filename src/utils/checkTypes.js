/**
 * Checks if an object's properties are the correct type
 *
 *
 *
 * @example
 * // checking if object can be used like a stack
 * const StackTypes = {
 *   push: 'function',
 *   pop: 'function',
 *   length: 'number',
 * };
 *
 * const goodStack = [];
 * const badStack = new Set();
 *
 * validateTypes(StackTypes, goodStack);  // No errors
 * validateTypes(StackTypes, badStack); // TypeError
 *
 *
 * @param {Object<string,string>} types Object with keys and expected type as `string`. Separate multiple types with `|` eg. `{ name: 'string', age: 'number|string', favoriteFood: 'string|undefined' }`
 * @param {*} object The object to validate
 * @param {string} [name='object'] Used for error message
 * @memberof Utils
 */
function validateTypes(types, object, name = 'object') {
  if (!object || typeof object !== 'object') throw new TypeError(`${name} is not valid`);
  Reflect.ownKeys(types).forEach(key => {
    const type = typeof object[key];
    //@ts-ignore 'symbol' cannot be used as an index type.
    const expectedTypes = types[key].split('|');
    if (!expectedTypes.includes(type)) {
      throw new TypeError(`${name}.${String(key)} should be a ${expectedTypes.join(' or ')}`);
    }
  });
}

module.exports = validateTypes;
