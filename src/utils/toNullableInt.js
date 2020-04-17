const { MIN_SAFE_INTEGER, MAX_SAFE_INTEGER } = Number;

/**
 * Tries to convert given value to null or a safe integer
 * @example
 * toNullableInt("2") // 2
 * toNullableInt(3.14) // 3
 * toNullableInt(false) // null
 * toNullableInt(true) // TypeError
 *
 * @param {*} value Value to convert. Works with `null`, `false` and integer-like values. eg. `'2'`, `3.14`,...
 * @param {string} [name='value'] Used for error message
 * @param {IntegerRange} [range] Accepted range for integer conversion
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
