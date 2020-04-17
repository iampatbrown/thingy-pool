const { TimeoutError, ErrorMessages } = require('./errors');

/**
 * A wrapped promise with a timeout
 *
 * @example
 * const requestQueue = []
 *
 * // A function that creates requests and stores them in an array
 * function createRequest(timeoutInMs) {
 *  const request = new PoolRequest(timeoutInMs)
 *  requestQueue.push(request) // store the request so it can be resolved later
 *  return request.getPromise() // only return the promise to the caller of makeRequest
 * }
 *
 * // A function that creates an object and tries to resolve a request
 * function createThingyAndTryResolveRequest(){
 *  const thingy = new Thingy()
 *  const request = requestQueue.unshift()
 *  if(request && !request.didTimeout()) request.resolve(thingy)
 * }
 *
 * @template {object} T
 */
class PoolRequest {
  /**
   *
   * @param {number | null} [timeoutInMs=null] Number of milliseconds to wait before request times out. `null` will disable the timeout
   * @param {function():number} [getTimestamp=Date.now] Function to get the current timestamp. See [Date.now()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now}
   */
  constructor(timeoutInMs = null, getTimestamp = Date.now) {
    /**
     * Function to get the current timestamp
     * @type {function():number}
     */
    this._getTimestamp = getTimestamp;

    /**
     * The wrapped promise that resolves to the request type
     * @type {Promise<T>}
     */
    this._promise = new Promise((resolve, reject) => {
      /**
       * Function use to resolve the wrapped promise
       * @type {function(T):void}
       * @param {T} object
       */
      this._resolve = resolve;
      /**
       * Function used to reject the wrapped promise
       * @type {function(Error):void}
       * @param {Error} reason
       */
      this._reject = reject;
    });

    /**
     * Timestamp captured if the request timed out
     * @type {number}
     */
    this._timedOutAt = 0;

    /**
     * Timeout object that will reject the request if called. Used to clear the timeout if resolved/rejected before request times out
     * @type {NodeJS.Timeout|null}
     */
    this._timeoutId = null;

    // Chose to use null here instead of 0 in case timeoutInMs is calculated eg. timeoutInMs = shouldTimeoutAt - Date.now() // 0
    if (timeoutInMs !== null) {
      this._timeoutId = setTimeout(() => this._handleTimeout(), timeoutInMs);
    }
  }

  /**
   * Records the time the request timed out and rejects the promise with a TimeoutError
   */
  _handleTimeout() {
    this._timedOutAt = this._getTimestamp();
    this._reject(new TimeoutError(ErrorMessages.REQUEST_DID_TIMEOUT));
  }

  /**
   *  Whether the requests has timed out
   *  @returns {boolean}
   */
  didTimeout() {
    return !!this._timedOutAt;
  }

  /**
   * The promise for this request
   * @returns {Promise<T>}
   */
  getPromise() {
    return this._promise;
  }

  /**
   * Whether the requests was created with a timeout
   * @returns {boolean}
   */
  hasTimeout() {
    return !!this._timeoutId;
  }

  /**
   * Rejects the request and cancels the timeout if required
   * @param {Error} [reason] reason the request was rejected
   */
  reject(reason = new Error(ErrorMessages.UNKNOWN_REJECTION)) {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._reject(reason);
  }

  /**
   * Resolves the request and cancels the timeout if required
   * @param {T} object object being dispatched to request
   */
  resolve(object) {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._resolve(object);
  }
}

module.exports = PoolRequest;
