const { MIN_SAFE_INTEGER, MAX_SAFE_INTEGER } = Number;

/**
 *
 * Convert value to safe integer or null else throw
 * @example
 * toNullableInt("2") // 2
 * toNullableInt(false) // null
 * toNullableInt(true) // TypeError
 *
 * @param {*} value
 * @param {string} [name='value'] Used in error message
 * @param {object} [range]
 * @param {number} [range.min=MIN_SAFE_INTEGER]
 * @param {number} [range.max=MAX_SAFE_INTEGER]
 * @returns {number | null}
 * @memberof Utils
 */
function toNullableInt(value, name = 'value', { min = MIN_SAFE_INTEGER, max = MAX_SAFE_INTEGER } = {}) {
  if (value === null || value === false) return null;
  const parsedValue = Math.trunc(value);
  const isValidType = typeof value === 'number' || typeof value === 'string';
  if (!isValidType || Number.isNaN(parsedValue) || parsedValue < min || parsedValue > max) {
    throw new TypeError(`${name} must be a number from ${min} to ${max} or null`);
  }
  return parsedValue;
}

module.exports = toNullableInt;
