/**
 * Convert value to boolean else throw
 * @example
 * toBoolean(true) // true
 * toBoolean(0) // false
 * toBoolean(2) // TypeError
 * @param {*} value
 * @param {string} [name='value'] Used in error message
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
