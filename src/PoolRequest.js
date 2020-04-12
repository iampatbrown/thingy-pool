const { TimeoutError, ErrorMessages } = require('./errors');

/**
 * PoolRequest
 * A wrapped promise with a timeout
 *
 * @example
 * const requestQueue = []
 *
 * // A function that creates requests and stores them in an array
 * function makeRequest(timeoutInMs) {
 *  const request = new PoolRequest(timeoutInMs)
 *  requestQueue.push(request) // store the request so it can be resolved later
 *  return request.getPromise() // only return the promise to the caller of makeRequest
 * }
 *
 * // A function that creates an object and tries to resolve a request
 * async function createThingy(){
 *  const thingy = new Thingy()
 *  await thing.connect()
 *  const request = requestQueue.unshift()
 *  if(request) request.resolve(thingy)
 * }
 *
 * @template T
 * @private
 */
class PoolRequest {
  /**
   * @param {number | null} [timeoutInMs=null] timeout for requests. null is no timeout.
   * @param {function():number} [getTimestamp=Date.now] Mainly used for testing. See [Date.now()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now}
   */

  constructor(timeoutInMs = null, getTimestamp = Date.now) {
    this._getTimestamp = getTimestamp;

    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    if (timeoutInMs !== null && timeoutInMs !== undefined) {
      this._timeoutAt = null;
      this._timeoutId = setTimeout(() => this._handleTimeout(), timeoutInMs);
    }
  }

  /**
   * Resolves the promise for this request and cancels the timeout if required
   * @param {PooledObject} object
   */
  resolve(object) {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._resolve(object);
  }

  /**
   * Rejects the promise for this request and cancels the timeout if required
   * @param {Error} [reason]
   */
  reject(reason = new Error(ErrorMessages.UNKNOWN_REJECTION)) {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._reject(reason);
  }

  /**
   * The promise for this request
   * @returns {Promise<PooledObject>}
   */
  getPromise() {
    return this._promise;
  }

  /**
   * Whether the requests was created using timeoutInMs
   * @returns {boolean}
   */
  hasTimeout() {
    return !!this._timeoutId;
  }

  /**
   *  Whether the requests has timed out
   *  @returns {boolean}
   */
  didTimeout() {
    return !!this._timeoutAt;
  }

  /**
   *
   * Records the timeout time and rejects the request with a TimeoutError
   */
  _handleTimeout() {
    this._timeoutAt = this._getTimestamp();
    this._reject(new TimeoutError(ErrorMessages.REQUEST_DID_TIMEOUT));
  }
}

module.exports = PoolRequest;
