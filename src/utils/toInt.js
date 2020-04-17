const { MIN_SAFE_INTEGER, MAX_SAFE_INTEGER } = Number;

/**
 * @typedef {Object} IntegerRange
 * @property {number} [min=MIN_SAFE_INTEGER]
 * @property {number} [max=MIN_SAFE_INTEGER]
 * @private
 * @memberof Utils
 * @alias IntegerRange
 */

/**
 * Tries to convert given value to a safe integer
 * @example
 * toInt("2") // 2
 * toInt(-4.5) // -4
 * toInt(false) // TypeError
 *
 * @param {*} value Value to convert. Works with integer-like values. eg. `'2'`, `3.14`,...
 * @param {string} [name='value'] Used for error message
 * @param {IntegerRange} [range] Accepted range for integer conversion
 * @returns {number}
 * @memberof Utils
 */
function toInt(value, name = 'value', { min = MIN_SAFE_INTEGER, max = MAX_SAFE_INTEGER } = {}) {
  const parsedValue = Math.trunc(value);
  const isValidType = typeof value === 'number' || typeof value === 'string';
  if (!isValidType || Number.isNaN(parsedValue) || parsedValue < min || parsedValue > max) {
    throw new TypeError(`${name} must be a number from ${min} to ${max}`);
  }
  return parsedValue;
}

module.exports = toInt;
