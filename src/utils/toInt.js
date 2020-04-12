const { MIN_SAFE_INTEGER, MAX_SAFE_INTEGER } = Number;

/**
 * Convert value to safe integer else throw
 * @example
 * toInt("2") // 2
 * toInt(-4.5) // -4
 * toInt(false) // TypeError
 *
 * @param {*} value
 * @param {string} [name='value'] Used in error message
 * @param {object} [range]
 * @param {number} [range.min=MIN_SAFE_INTEGER]
 * @param {number} [range.max=MAX_SAFE_INTEGER]
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
