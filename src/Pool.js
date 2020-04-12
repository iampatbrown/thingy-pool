/// <reference path="../@types/index.d.ts" />
const { EventEmitter } = require('events');
const { PriorityQueue, Queue } = require('./queues');
const PooledObject = require('./PooledObject');
const PoolOptions = require('./PoolOptions');
const PoolRequest = require('./PoolRequest');

const { Factory, ObjectQueue, RequestQueue } = require('./interfaces');
const { toSafePromise } = require('./utils');
const { ErrorMessages, TimeoutError } = require('./errors');
const { PoolStates, PoolEvents } = require('./constants');

/**
 * @extends {EventEmitter}
 * @template T Thingy
 */
class Pool extends EventEmitter {
  /**
   *Creates an instance of Pool.
   * @param {Factory} factory
   * @param {Options} [options]
   * @param {Object} [injectables]
   * @param {Queue} [injectables.objectQueue=new Queue()]
   * @param {PriorityQueue} [injectables.requestQueue=new PriorityQueue()]
   * @param {function():number} [injectables.getTimestamp=Date.now] Mainly used for testing. See [Date.now()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now}
   */
  constructor(
    factory,
    options = {},
    { objectQueue = new Queue(), requestQueue = new PriorityQueue(), getTimestamp = Date.now } = {},
  ) {
    Factory.validate(factory);
    ObjectQueue.validate(objectQueue);
    RequestQueue.validate(requestQueue);
    super();

    this._getTimestamp = getTimestamp;

    this._factory = factory;

    this._options = new PoolOptions(options);

    /**
     *  All pooled objects accept those being destroyed. Key by the associated object.
     *  @type {Map<T,PooledObject<T>>}
     */
    this._pooledObjects = new Map();

    /**
     * Pending request queue
     * @type {RequestQueue<T>}
     *  */
    this._requests = requestQueue;

    /**
     * Available Pooled Objects
     * @type {ObjectQueue<T>}
     */
    this._available = objectQueue;

    /**
     * Collection of pooled objects that are borrowed
     * @type {Set<PooledObject<T>>}
     */
    this._borrowed = new Set();

    /**
     * Collection of pooled objects that are being validated before being dispatched to a request
     * @type {Set<PooledObject<T>>}
     */
    this._beingValidatedForDispatch = new Set();

    /**
     * Collection of pooled objects that are being validated before being returned to available objects
     * @type {Set<PooledObject<T>>}
     */
    this._beingValidatedForReturn = new Set();

    /**
     * Collection of pooled objects that are being destroyed.
     * @type {Set<PooledObject<T>>}
     */
    this._beingDestroyed = new Set();

    /**
     * Collection of promises for objects currently being created. Will resolve to the created object.
     * @type {Set<SafePromise<T>>}
     */
    this._createPromises = new Set();

    /**
     * Collection of promises for objects currently being validated. Will resolve to the validation result
     * @type {Set<SafePromise<boolean>>}
     */
    this._validatePromises = new Set();

    /**
     * Collection of promises for objects currently being destroyed. Will resolve to the destroy result
     * @type {Set<SafePromise<boolean|undefined>>}
     */
    this._destroyPromises = new Set();

    /**
     * The timeoutID for the next scheduled object eviction. Use to cancel when the pool stops.
     * @type {number}
     */
    this._scheduledEviction = 0;

    /**
     * Unique promise created on the initial call to pool.start. All subsequent calls to pool.start return this promise.
     * @type {Promise<void>}
     */
    this._startPromise = null;

    /**
     * Unique promise created on the initial call to pool.stop. All subsequent calls to pool.stop return this promise.
     * @type {Promise<void>}
     */
    this._stopPromise = null;

    /**
     * The current pool state
     * @type {number}
     */
    this._state = PoolStates.CREATED;

    if (this._options.shouldAutoStart) this.start();

    this._createdAt = this._getTimestamp();
  }

  _acquire({ priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    const request = new PoolRequest(timeoutInMs, this._getTimestamp);
    this._requests.enqueue(request, priority);
    if (request.hasTimeout()) this._handleRequestTimeout(request);
    this._pump();
    return request.getPromise();
  }

  async _acquireNextLoop({ priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    await new Promise(resolve => setImmediate(resolve));
    if (this._state >= PoolStates.SHUTTING_DOWN) throw this._getStateError();
    if (this._hasMaxPendingRequests()) throw new RangeError(ErrorMessages.MAX_REQUESTS);
    return this._acquire({ priority, timeoutInMs });
  }

  _addToAvailable(pooledObject) {
    pooledObject.setToAvailable();
    this._available.push(pooledObject);
    this._pump();
  }

  async _destroy(pooledObject) {
    pooledObject.setToInvalid();
    this._pooledObjects.delete(pooledObject.getObject());
    this._beingDestroyed.add(pooledObject);
    const didDestroy = await this._factoryDestroy(pooledObject.getObject());
    this._beingDestroyed.delete(pooledObject);
    if (didDestroy) pooledObject.setToDestroyed();
  }

  _dispatch(pooledObject) {
    pooledObject.setToAvailable();
    const request = this._dequeueRequest();
    if (request) {
      pooledObject.setToBorrowed();
      this._borrowed.add(pooledObject);
      request.resolve(pooledObject.getObject());
    } else {
      this._addToAvailable(pooledObject);
    }
  }

  _dequeueRequest() {
    let request = this._requests.dequeue();
    while (request && request.didTimeout()) {
      /* ignore coverage: don't think this can happen... will check later */
      request = this._requests.dequeue();
    }
    return request;
  }

  _dispatchAvailable() {
    const qtyNeeded = this._requests.length - this._beingValidatedForDispatch.size;
    const qtyToDispatch = Math.min(qtyNeeded, this._available.length);
    for (let i = 0; i < qtyToDispatch; i += 1) {
      const pooledObject = this._options.shouldUseFifo ? this._available.shift() : this._available.pop();
      /* ignore coverage: shouldn't happen */
      if (!pooledObject) return;
      if (this._options.shouldValidateOnDispatch) {
        this._validateThenDispatchOrDestroy(pooledObject);
      } else {
        this._dispatch(pooledObject);
      }
    }
  }

  _ensureSize() {
    if (this._state >= PoolStates.SHUTTING_DOWN) return;
    const spareCapacity = this._options.maxSize - this.getSize();
    const qtyToReachMin = this._options.minSize - this.getSize();
    const qtyNeededForRequests = this._requests.length - this._getQtyNotBorrowed();
    const qtyToCreate = Math.min(Math.max(qtyToReachMin, qtyNeededForRequests), spareCapacity);
    for (let i = 0; i < qtyToCreate; i += 1) {
      this._factoryCreate();
    }
  }

  _evictIdle() {
    const maxToEvict = this._options.testsPerEviction || this._available.length;
    let didEvictIdle = this._tryEvictNext();
    for (let i = 1; i < maxToEvict && didEvictIdle; i += 1) {
      didEvictIdle = this._tryEvictNext();
    }
    this._evictSchedule();
  }

  _tryEvictNext() {
    if (this._available.length < 1 || !this._shouldEvict(this._available.peek())) return false;
    this._destroy(this._available.shift());
    this._pump();
    return true;
  }

  _shouldEvict(pooledObject) {
    const idleTime = pooledObject.getIdleTime();
    const { minIdleTime, maxIdleTime, minSize } = this._options;
    const qtyAvailable = this._available.length;
    if (maxIdleTime && idleTime > maxIdleTime) return true;
    if (minIdleTime && idleTime > minIdleTime && qtyAvailable > minSize) return true;
    return false;
  }

  _evictSchedule() {
    if (!this._options.evictionIntervalInMs || this._options.evictionIntervalInMs < 1) return;
    this._scheduledEviction = setTimeout(() => this._evictIdle(), this._options.evictionIntervalInMs);
  }

  _evictStop() {
    if (!this._scheduledEviction) return;
    clearTimeout(this._scheduledEviction);
    this._scheduledEviction = null;
  }

  async _factoryCreate() {
    try {
      const promise = toSafePromise(this._factory.create());
      this._createPromises.add(promise);
      const { result: object, error } = await promise;
      this._createPromises.delete(promise);
      if (error) throw error;
      const pooledObject = new PooledObject(object, this._getTimestamp);
      this._pooledObjects.set(object, pooledObject);
      this._addToAvailable(pooledObject);
    } catch (error) {
      /**
       * @event Pool#factoryCreateError
       */
      this.emit(PoolEvents.CREATE_ERROR, error);
      this._pump();
    }
  }

  async _factoryDestroy(object) {
    try {
      const promise = toSafePromise(this._factory.destroy(object));
      this._destroyPromises.add(promise);
      const { result: didDestroy, error } = await promise;
      this._destroyPromises.delete(promise);
      if (error) throw error;
      return didDestroy;
    } catch (error) {
      /**
       * @event Pool#factoryDestroyError
       */
      this.emit(PoolEvents.DESTROY_ERROR, error);
      return false;
    }
  }

  async _factoryValidate(object) {
    try {
      const promise = toSafePromise(this._factory.validate(object));
      this._validatePromises.add(promise);
      const { result: isValid, error } = await promise;
      this._validatePromises.delete(promise);
      if (error) throw error;
      return isValid;
    } catch (error) {
      /**
       * @event Pool#factoryValidateError
       */
      this.emit(PoolEvents.VALIDATE_ERROR, error);
      return false;
    }
  }

  _getQtyNotBorrowed() {
    return (
      this._available.length +
      this._beingValidatedForDispatch.size +
      this._beingValidatedForReturn.size +
      this._createPromises.size
    );
  }

  _getStateError() {
    if (this._state < PoolStates.STARTED) return new TypeError(ErrorMessages.POOL_NOT_STARTED);
    if (this._state === PoolStates.SHUTTING_DOWN) return new TypeError(ErrorMessages.IS_SHUTTING_DOWN);
    return new TypeError(ErrorMessages.IS_STOPPED);
  }

  async _handleRequestTimeout(request) {
    try {
      await request.getPromise();
    } catch (error) {
      if (error instanceof TimeoutError) this._requests.remove(request);
    }
  }

  _hasMaxPendingRequests() {
    if (this._options.maxPendingRequests === null) return false;
    if (this._available.length > 0 || this.getSize() < this._options.maxSize) return false;
    return this._requests.length >= this._options.maxPendingRequests;
  }

  _pump() {
    this._ensureSize();
    if (this._requests.length > 0) this._dispatchAvailable();
  }

  async _start() {
    this._pump();
    await Promise.all(this._createPromises);
    this._evictSchedule();
    this._state = PoolStates.STARTED;
    /**
     * @event Pool#poolDidStart
     */
    this.emit(PoolEvents.STARTED);
  }

  async _stop() {
    this._evictStop();
    const outstandingRequests = [...this._requests].map(request => toSafePromise(request.getPromise()));
    await Promise.all(outstandingRequests);
    await this.clear();
    const outstandingLoans = [...this._borrowed].map(pooledObject => pooledObject.getLoanPromise());
    await Promise.all(outstandingLoans);
    await Promise.all(this._validatePromises);
    await this.clear();
    this._state = PoolStates.STOPPED;
    /**
     * @event Pool#poolDidStop
     */
    this.emit(PoolEvents.STOPPED);
  }

  async _validateThenAddToAvailableOrDestroy(pooledObject) {
    pooledObject.setToValidating();
    this._beingValidatedForReturn.add(pooledObject);
    const isValid = await this._factoryValidate(pooledObject.getObject());
    this._beingValidatedForReturn.delete(pooledObject);
    if (isValid) {
      this._addToAvailable(pooledObject);
    } else {
      this._destroy(pooledObject);
      this._pump();
    }
  }

  async _validateThenDispatchOrDestroy(pooledObject) {
    pooledObject.setToValidating();
    this._beingValidatedForDispatch.add(pooledObject);
    const isValid = await this._factoryValidate(pooledObject.getObject());
    this._beingValidatedForDispatch.delete(pooledObject);
    if (isValid) {
      this._dispatch(pooledObject);
    } else {
      this._destroy(pooledObject);
      this._pump();
    }
  }

  /**
   * Request an object from the Pool.
   *
   * If no objects are available and the pool is below maxSize a new one will be created.
   *
   * The request will be rejected if an object isn't provided within the the timeoutInMs.
   *
   * @example
   * // With defaults
   * const thingy = await pool.acquire()
   *
   * @example
   * // With higher priority
   * const thingy = await pool.acquire({ priority: 5 })
   *
   * @example
   * // With higher priority and custom timeout
   * const thingy = await pool.acquire({  priority: 10, timeoutInMs: 1000 })
   *
   *
   *
   * @param {Object} [options]
   * @param {number} [options.priority=0] The priority of the request. Objects are dispatched to requests with
   * with higher priority first with 0 being the lowest priority
   * @param {number|null} [options.timeoutInMs=30000] Time in milliseconds before the request times out
   * @returns {Promise<T>}
   */
  async acquire({ priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    if (this._state === PoolStates.CREATED) this.start();
    if (this._state >= PoolStates.SHUTTING_DOWN) throw this._getStateError();
    if (this._hasMaxPendingRequests()) return this._acquireNextLoop({ priority, timeoutInMs });
    return this._acquire({ priority, timeoutInMs });
  }

  /**
   * Destroys all pooled objects that are currently available. Resolves after objects have been destroyed.
   *
   *  @returns {Promise<void>}
   */
  async clear() {
    let pooledObject = this._available.shift();
    while (pooledObject) {
      this._destroy(pooledObject);
      pooledObject = this._available.shift();
    }
    await Promise.all(this._destroyPromises);
    this._pump();
  }

  /**
   * @typedef {Object} PoolInfo
   * @property {number} available
   * @property {number} beingCreated
   * @property {number} beingDestroyed
   * @property {number} beingValidated
   * @property {number} beingValidatedForDispatch
   * @property {number} beingValidatedForReturn
   * @property {number} pendingRequests
   * @property {number} borrowed
   * @property {number} notBorrowed
   * @property {number} size
   * @property {number} state
   * @memberof Pool
   */

  /**
   * Returns object with current pool information. Mostly object counts.
   *
   * @example
   * if(pool.getInfo().available > 0) {
   *  const thingy = await pool.acquire()
   * // do something with thingy
   * }
   *
   * @returns {PoolInfo}
   */
  getInfo() {
    return {
      available: this._available.length,
      beingCreated: this._createPromises.size,
      beingDestroyed: this._destroyPromises.size,
      beingValidated: this._validatePromises.size,
      beingValidatedForDispatch: this._beingValidatedForDispatch.size,
      beingValidatedForReturn: this._beingValidatedForReturn.size,
      borrowed: this._borrowed.size,
      pendingRequests: this._requests.length,
      notBorrowed: this._getQtyNotBorrowed(),
      size: this._pooledObjects.size + this._createPromises.size,
      state: this.getState(),
    };
  }

  /**
   * @returns {Options}
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * @returns {number}
   */
  getSize() {
    return this._pooledObjects.size + this._createPromises.size;
  }

  /**
   * @returns {PoolState}
   */
  getState() {
    return Object.keys(PoolStates).find(key => PoolStates[key] === this._state);
  }

  /**
   *
   *
   * @param {Object} object
   * @returns {boolean}
   */
  has(object) {
    return this._pooledObjects.has(object);
  }

  /**
   * @param {T} object
   * @returns {boolean}
   */
  isBorrowed(object) {
    const pooledObject = this._pooledObjects.get(object);
    return pooledObject && this._borrowed.has(pooledObject);
  }

  /**
   * @param {T} object
   * @returns {Promise<void>}
   */
  async release(object) {
    const pooledObject = this._pooledObjects.get(object);
    if (!pooledObject) throw new ReferenceError(ErrorMessages.NOT_IN_POOL);
    pooledObject.setToReturned();
    this._borrowed.delete(pooledObject);
    if (this._options.shouldValidateOnReturn) {
      await this._validateThenAddToAvailableOrDestroy(pooledObject);
    } else {
      this._addToAvailable(pooledObject);
    }
  }

  /**
   * @param {T} object
   * @returns {Promise<void>}
   */
  async releaseAndDestroy(object) {
    const pooledObject = this._pooledObjects.get(object);
    if (!pooledObject) throw new ReferenceError(ErrorMessages.NOT_IN_POOL);
    pooledObject.setToReturned();
    this._borrowed.delete(pooledObject);
    const destroyPromise = this._destroy(pooledObject);
    this._pump();
    await destroyPromise;
  }

  /**
   * Starts the pool
   * @returns {Promise<void>} Resolves after pool is started
   */
  start() {
    if (this._state >= PoolStates.SHUTTING_DOWN) return Promise.reject(this._getStateError());
    if (this._state >= PoolStates.STARTING) return this._startPromise;
    this._state = PoolStates.STARTING;
    this._startPromise = this._start();
    return this._startPromise;
  }

  /**
   * Stops the pool
   * @returns {Promise<void>} Resolves after pool is stopped
   */
  stop() {
    if (this._state < PoolStates.STARTED) return Promise.reject(this._getStateError());
    if (this._state >= PoolStates.SHUTTING_DOWN) return this._stopPromise;
    this._state = PoolStates.SHUTTING_DOWN;
    this._stopPromise = this._stop();
    return this._stopPromise;
  }

  /**
   *
   *
   * @param {function} callback
   * @param {Object} [options]
   * @param {number} [options.priority=0] The priority of the request. Objects are dispatched to requests with
   * with higher priority first with 0 being the lowest priority
   * @param {number|null} [options.timeoutInMs=30000] Time in milliseconds before the request times out
   * @returns {Promise<any>} Result from callback
   */
  async use(callback, { priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    if (typeof callback !== 'function') throw TypeError(ErrorMessages.CALLBACK_MUST_BE_FUNCTION);
    const object = await this.acquire({ priority, timeoutInMs });
    try {
      const result = await callback(object);
      this.release(object).catch();
      return result;
    } catch (error) {
      this.release(object).catch();
      throw error;
    }
  }
}

module.exports = Pool;
