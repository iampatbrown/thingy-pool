/**
 * Tries to convert given value to a boolean
 * @example
 * toBoolean(true) // true
 * toBoolean(0) // false
 * toBoolean('FALSE') // false
 * toBoolean(2) // TypeError
 * @param {*} value Value to convert. Works with boolean-like values. eg. `1`, `'TRUE'`, `'0'`,...
 * @param {string} [name='value'] Used for error message
 * @returns {boolean}
 * @memberof Utils
 */
function toBoolean(value, name = 'value') {
  if (typeof value === 'boolean') return value;
  const lowerCase = typeof value === 'string' ? value.toLowerCase() : undefined;
  if (value === 1 || value === '1' || lowerCase === 'true') return true;
  if (value === 0 || value === '0' || lowerCase === 'false') return false;
  throw new TypeError(`${name} must be a boolean (true/false or 1/0)`);
}

module.exports = toBoolean;
