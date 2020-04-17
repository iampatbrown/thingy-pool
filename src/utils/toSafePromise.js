/**
 * @typedef {Object} SafePromiseResult
 * @property {T} result
 * @property {undefined} [error]
 * @template T
 * @private
 * @memberof Utils
 * @alias SafePromiseResult
 */

/**
 * @typedef {Object} SafePromiseError
 * @property {undefined} [result]
 * @property {*} error
 * @private
 * @memberof Utils
 * @alias SafePromiseError
 */

/**
 * A Promise that doesn't throw. Resolves to an object containing the promised result or a caught error
 * @example
 * const { result, error } = await safePromise
 * @typedef {Promise<SafePromiseResult<T>|SafePromiseError>} SafePromise
 * @template T
 * @private
 * @memberof Utils
 * @alias SafePromise
 */

/**
 * Returns a new promise that resolves to an object containing the result of the given promise or the caught error
 * @example
 * const { result, error } = await toSafePromise(promise)
 *
 * // can be used with Promise.all() to safely await all promises
 * const safePromises = arrayOfPromises.map(promise => toSafePromise(promise))
 * const results = await Promise.all(safePromises)
 * results // [{ result: 'OK' }, { result: 'OK' }, { error: Error }, { result: 'OK' }]
 *
 *
 * @template T
 * @param {Promise<T>|T} promise Promise to convert
 * @returns {SafePromise<T>}
 * @memberof Utils
 */
async function toSafePromise(promise) {
  try {
    return { result: await promise };
  } catch (error) {
    return { error: error || new Error('UnknownPromiseRejection') };
  }
}

module.exports = toSafePromise;
