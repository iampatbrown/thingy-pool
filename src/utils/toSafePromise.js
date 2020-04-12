/**
 * @interface SafePromiseResult
 * @template  T
 * @property {T} result
 */

/**
 * @interface SafePromiseError
 * @property {*} error
 */

/**
 * Wrapped promise
 * @interface SafePromise
 * @template  T
 * @extends {Promise<SafePromiseResult<T>|SafePromiseError>}}
 */

/**
 * Wraps promise in try catch block and returns a new promise that resolves to an object containing
 * the result or the error
 * @example
 * // can be used with Promise.all() to safely await all promises
 * const safePromises = promises.map(promise => toSafePromise(promise))
 * const results = await Promise.all(safePromises)
 * results // [{ result: 'OK' }, { result: 'OK' }, { error: Error }, { result: 'OK' }]
 *
 * @example
 * // storing pending promises in a set and removing after promise resolves
 * const pendingPromises = new Set()
 * const promise = doSomethingAsync()
 * pendingPromises.add(promise)
 * const { result, error } = await toSafePromise(promise)
 * pendingPromises.delete(promise)
 * if(error) throw error
 * return result
 *
 * @example
 * // mainly to avoid this pattern
 * const pendingPromises = new Set()
 * const promise = doSomethingAsync()
 * pendingPromises.add(promise)
 * try {
 *  const result = await promise
 *  pendingPromises.delete(promise)
 *  return result
 * } catch (error){
 *  pendingPromises.delete(promise)
 *  throw error
 * }
 *
 * @template T
 * @param {Promise<T>} promise
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
