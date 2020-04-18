const { EventEmitter } = require('events');
const PooledObject = require('./PooledObject');
const PoolOptions = require('./PoolOptions');
const PoolRequest = require('./PoolRequest');
const { PoolStates, PoolEvents } = require('./constants');
const { ErrorMessages, TimeoutError } = require('./errors');
const { PriorityQueue, DoubleEndedQueue } = require('./queues');
const { toSafePromise, validateFactory, validateObjectQueue, validateRequestQueue } = require('./utils');

// does nothing aka noop
const doNothing = () => {};

/**
 * @example
 * const Pool = require('thingy-pool');
 * const factory = require('./myObjectFactory')
 *
 * const options = { maxSize: 5 }
 * const pool = new Pool(factory, options)
 *
 * async function fetchSomething() { // or const fetchSomething = async () => {
 *  const thingy = await pool.acquire()
 *  const result = await thingy.fetchSomething()
 *  pool.release(thingy)
 *  return result
 * }
 *
 * fetchSomething().then(result => console.log(result)) // something
 * fetchSomething().then(result => console.log(result)) // something
 *
 * @extends {EventEmitter}
 * @template {object} T
 */
class Pool extends EventEmitter {
  /**
   * @param {Factory<T>} factory Factory used by the pool
   * @param {Partial<Options>} [options=Options] Options for the pool
   * @param {Object} [injectables] Dependencies that can be injected into the pool. For using custom queue implementations as well as provide additional
   * functionality for testing
   * @param {ObjectQueue<PooledObject<T>>} [injectables.objectQueue=new DoubleEndedQueue()] Queue that stores the available pooled objects. See {@link ObjectQueue} for more info
   * @param {RequestQueue<PoolRequest<T>>} [injectables.requestQueue=new PriorityQueue()] PriorityQueue that stores pending requests. See {@link RequestQueue} for more info
   * @param {function():number} [injectables.getTimestamp=Date.now] Function used by the pool to get the current timestamp. Useful for testing.
   * See [Date.now()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now}
   */
  constructor(
    factory,
    options = {},
    { objectQueue = new DoubleEndedQueue(), requestQueue = new PriorityQueue(), getTimestamp = Date.now } = {},
  ) {
    super();

    /**
     * Function to get the current timestamp
     * @type {function():number}
     */
    this._getTimestamp = getTimestamp;

    /**
     * The current options
     * @type {PoolOptions}
     */
    this._options = new PoolOptions(options);

    // check if the factory and queues are valid
    const shouldValidate = this._options.shouldValidateOnDispatch || this._options.shouldValidateOnReturn;
    validateFactory(factory, shouldValidate);
    validateObjectQueue(objectQueue);
    validateRequestQueue(requestQueue);

    /**
     * The object factory
     * @type {Factory<T>}
     */
    this._factory = factory;

    /**
     *  All pooled objects except those being destroyed. Keyed by the associated object
     *  @type {Map<T,PooledObject<T>>}
     */
    this._pooledObjects = new Map();

    /**
     * Pending request queue
     * @type {RequestQueue<PoolRequest<T>>}
     */
    this._requests = requestQueue;

    /**
     * Available pooled objects
     * @type {ObjectQueue<PooledObject<T>>}
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
     * Collection of pooled objects that are being validated before being returned to the available object queue
     * @type {Set<PooledObject<T>>}
     */
    this._beingValidatedForReturn = new Set();

    /**
     * Collection of pooled objects that are being destroyed.
     * @type {Set<PooledObject<T>>}
     */
    this._beingDestroyed = new Set();

    /**
     * Collection of safe promises for objects currently being created
     * @type {Set<SafePromise<T>>}
     */
    this._createPromises = new Set();

    /**
     * Collection of safe promises for objects currently being validated
     * @type {Set<SafePromise<boolean>>}
     */
    this._validatePromises = new Set();

    /**
     * Collection of safe promises for objects currently being destroyed
     * @type {Set<SafePromise<void>>}
     */
    this._destroyPromises = new Set();

    // binding here so an anonymous function isn't created every time an idle object check is scheduled
    this._tryRemoveIdleObjects = this._tryRemoveIdleObjects.bind(this);

    /**
     * The timeoutID for the next scheduled idle object check. Used to cancel timeout when the pool stops
     * @type {NodeJS.Timeout|null}
     */
    this._nextIdleObjectCheck = null;

    /**
     * Unique promise created on the initial call to {@link Pool#start|pool.start()}. All calls to {@link Pool#start|pool.start()} return this promise
     * @type {Promise<void>}
     */
    // @ts-ignore
    this._startPromise = null;

    /**
     * Unique promise created on the initial call to {@link Pool#stop|pool.stop()}. All calls to {@link Pool#stop|pool.stop()} return this promise
     * @type {Promise<void>}
     */
    // @ts-ignore
    this._stopPromise = null;

    /**
     * The current pool state
     * @type {number}
     */
    this._state = PoolStates.CREATED;

    /**
     * Timestamp for when the pool was created
     * @type {number}
     */
    this._createdAt = this._getTimestamp();

    if (this._options.shouldAutoStart) this.start();
  }

  /**
   * Creates a request for an object and adds it to the request queue. Returns a promise for the object
   * @param {Object} [options]
   * @param {number} [options.priority=0] The priority for the request. The higher the number the higher the priority
   * @param {number|null} [options.timeoutInMs=30000] Time in milliseconds before the request times out
   * @returns {Promise<T>}
   */
  _newRequest({ priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    /** @type {PoolRequest<T>} */
    const request = new PoolRequest(timeoutInMs, this._getTimestamp);
    this._requests.enqueue(request, priority);
    // if the new request has a timeout we need to keep track of it in case it times out
    if (request.hasTimeout()) this._handleRequestTimeout(request);
    // pump gets called now that there is a new request in the queue
    this._pump();
    return request.getPromise();
  }

  /**
   * Wait until the next event loop iteration before trying to acquire an object. Used when the request queue is full to allow an additional
   * check in case any objects are returned in the current iteration
   * @param {Object} [options]
   * @param {number} [options.priority=0] The priority for the request. The higher the number the higher the priority
   * @param {number|null} [options.timeoutInMs=30000] Time in milliseconds before the request times out
   * @returns {Promise<T>}
   */
  async _acquireNextLoop({ priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    // wait for the next event loop iteration... I'm basing this on the way node works... setImmediate might have different implementations...
    await new Promise(resolve => setImmediate(resolve));
    // pool state might have changed in previous loop so it needs to be checked
    if (this._state >= PoolStates.SHUTTING_DOWN) throw this._getStateError();
    // reject the request if the pool still has max requests
    if (this._hasMaxPendingRequests()) throw new RangeError(ErrorMessages.MAX_REQUESTS);
    return this._newRequest({ priority, timeoutInMs });
  }

  /**
   * Changes pooled object state to available and adds it to the object queue
   * @param {PooledObject<T>} pooledObject The pooled object to make available
   */
  _addToAvailable(pooledObject) {
    pooledObject.setToAvailable();
    this._available.push(pooledObject);
    this._pump();
  }

  /**
   * Destroys pooled object
   * @param {PooledObject<T>} pooledObject The pooled object to destroy
   */
  async _destroy(pooledObject) {
    // change state to invalid so it can no longer be used
    pooledObject.setToInvalid();
    // remove object from the pool so it no longer contributes to the pool size
    this._pooledObjects.delete(pooledObject.getObject());
    this._beingDestroyed.add(pooledObject);
    const didDestroy = await this._factoryDestroy(pooledObject.getObject());
    this._beingDestroyed.delete(pooledObject);
    if (didDestroy) pooledObject.setToDestroyed();
  }

  /**
   * Dispatches pooled object to a pending request if there are no requests the pooled object will be returned
   * to the available objects
   * @param {PooledObject<T>} pooledObject The pooled object being dispatched
   */
  _dispatch(pooledObject) {
    pooledObject.setToAvailable();
    const request = this._dequeueRequest();
    if (request) {
      pooledObject.setToBorrowed();
      this._borrowed.add(pooledObject);
      request.resolve(pooledObject.getObject());
    } else {
      // a request could time out while an object is being validated making the request queue empty
      this._addToAvailable(pooledObject);
    }
  }

  /**
   * Gets the next request in the queue. Returns `undefined` if empty
   * @returns {PoolRequest<T>|undefined}
   */
  _dequeueRequest() {
    let request = this._requests.dequeue();
    while (request && request.didTimeout()) {
      /* ignore coverage: don't think this can happen... */
      request = this._requests.dequeue();
    }
    return request;
  }

  /**
   * Tries to dispatch available pooled objects to pending requests
   */
  _dispatchAvailable() {
    // objects being validated will be dispatched shortly so we remove them from the qty needed
    const qtyNeeded = this._requests.length - this._beingValidatedForDispatch.size;
    // if there are no objects available or needed, qty to dispatch is 0
    const qtyToDispatch = Math.min(qtyNeeded, this._available.length);
    for (let i = 0; i < qtyToDispatch; i += 1) {
      const pooledObject = this._options.shouldUseFifo ? this._available.shift() : this._available.pop();
      /* ignore coverage: shouldn't happen because we check the queue length above */
      if (!pooledObject) return;
      if (this._options.shouldValidateOnDispatch) {
        this._validateThenDispatchOrDestroy(pooledObject);
      } else {
        this._dispatch(pooledObject);
      }
    }
  }

  /**
   * Check the current pool size and create additional objects if possible to fulfill pending requests or reach the minimum size
   */
  _ensureSize() {
    // if the pool is stopping or stopped it will no longer create new objects
    if (this._state >= PoolStates.SHUTTING_DOWN) return;
    // i originally had a lot of these counts and other checks as small separate methods but experienced performance problems... it worked better being more verbose...
    const poolSize = this._pooledObjects.size + this._createPromises.size;
    const qtyNotBorrowed = poolSize - this._borrowed.size;
    const spareCapacity = this._options.maxSize - poolSize;
    const qtyToReachMin = this._options.minSize - poolSize;
    const qtyNeededForRequests = this._requests.length - qtyNotBorrowed;
    const qtyToCreate = Math.min(Math.max(qtyToReachMin, qtyNeededForRequests), spareCapacity);
    for (let i = 0; i < qtyToCreate; i += 1) {
      this._factoryCreate();
    }
  }

  /**
   * Check and remove idle objects from the available object queue
   */
  _tryRemoveIdleObjects() {
    // if no max is set, check all available objects
    const maxToRemove = this._options.maxIdleToRemove || this._available.length;
    let didRemoveIdle = this._tryRemoveNextIdle();
    // this will stop when either the max idle objects have been removed or when tryRemoveNextIdle fails
    for (let i = 1; i < maxToRemove && didRemoveIdle; i += 1) {
      didRemoveIdle = this._tryRemoveNextIdle();
    }
    this._scheduleIdleObjectCheck();
  }

  /**
   * Check if the pooled object that has been queued the longest is considered idle. If it is idle, remove and destroy it
   * @returns {boolean}
   */
  _tryRemoveNextIdle() {
    // objects are always pushed to the queue, so the first will be the oldest. If this object is not considered idle, neither will the others
    // @ts-ignore peek will be defined if length is > 1
    if (this._available.length < 1 || !this._isIdle(this._available.peek())) return false;
    // remove from queue and destroy
    // @ts-ignore same as above
    this._destroy(this._available.shift());
    // TODO: should we pump here or inside tryRemoveIdleObjects. This would call pump on each object removal instead of after multiple objects are removed
    this._pump();
    return true;
  }

  /**
   * Check if the pooled object is considered idle by the pool
   * @param {PooledObject<T>} pooledObject The pooled object to check
   * @returns {boolean}
   */
  _isIdle(pooledObject) {
    // could potentially make this injectable and pass it the current pool options and info
    // eg. this._isIdle = injectables.isIdleObject
    // function isIdleObject(pooledObject, options, info){ // custom idle objet check returns true/false }
    // right now the objectQueue only needs to check the first item in the queue... so keeping this simple is probably best
    const idleTime = pooledObject.getIdleTime();
    const { softIdleTimeInMs, hardIdleTimeInMs, minSize } = this._options;
    const qtyAvailable = this._available.length;
    // considered idle if idleTime is more than the hardIdleTimeInMs regardless of minimum pool size
    if (hardIdleTimeInMs && idleTime > hardIdleTimeInMs) return true;
    // considered idle if idleTime is more than the softIdleTimeInMs and currently available objects is more than the minimum pool size
    if (softIdleTimeInMs && idleTime > softIdleTimeInMs && qtyAvailable > minSize) return true;
    return false;
  }

  /**
   * Schedules idle object check
   */
  _scheduleIdleObjectCheck() {
    // if idleCheckIntervalInMs is not set idle objects won't be checked... pretty sure i put this check here because i used to allow the option to be changed while the pool was running...
    if (!this._options.idleCheckIntervalInMs) return;
    this._nextIdleObjectCheck = setTimeout(this._tryRemoveIdleObjects, this._options.idleCheckIntervalInMs);
  }

  /**
   *
   * Cancel the next idle object check if set
   */
  _cancelNextIdleObjectCheck() {
    if (!this._nextIdleObjectCheck) return;
    clearTimeout(this._nextIdleObjectCheck);
    this._nextIdleObjectCheck = null;
  }

  /**
   * Creates a new object and adds it to the pool
   */
  async _factoryCreate() {
    // note on _factory methods: I use safe promises to help keep the pool size in sync as promises are resolved or if they are rejected... I'll make a diagram...
    try {
      const promise = toSafePromise(this._factory.create());
      // keeps track of how many objects are being created and can be used with Promise.all
      this._createPromises.add(promise);
      const { result: object, error } = await promise;
      this._createPromises.delete(promise);
      if (!object) throw error;
      // if object creation was successful, add it to the pool
      const pooledObject = new PooledObject(object, this._getTimestamp);
      this._pooledObjects.set(object, pooledObject);
      this._addToAvailable(pooledObject);
    } catch (error) {
      /**
       * An error occurred while trying to create an object. Likely an error from factory.create
       * @event Pool#factoryCreateError
       * @param {Error} error The error that occurred
       */
      this.emit(PoolEvents.CREATE_ERROR, error);
      // keeps the pool going and retries the object creation if needed
      this._pump();
    }
  }

  /**
   * Destroys an object that was created by the factory
   * @param {T} object The object being destroyed
   * @returns {Promise<boolean>}
   */
  async _factoryDestroy(object) {
    try {
      const promise = toSafePromise(this._factory.destroy(object));
      // keeps track of how many objects are being destroyed and can be used with Promise.all
      this._destroyPromises.add(promise);
      const { error } = await promise;
      this._destroyPromises.delete(promise);
      if (error) throw error;
      // used to look for a boolean from factory.destroy, but if we can return false, we should probably just throw an error so it can be emitted by the pool...
      return true;
    } catch (error) {
      /**
       * An error occurred while trying to destroy an object. Likely an error from factory.destroy
       * @event Pool#factoryDestroyError
       * @param {Error} error The error that occurred
       */
      this.emit(PoolEvents.DESTROY_ERROR, error);
      // because there was an error, we assume the object wasn't correctly destroyed
      return false;
    }
  }

  /**
   * Checks if an object created by the factory is valid
   * @param {T} object The object being validated
   * @returns {Promise<boolean>}
   */
  async _factoryValidate(object) {
    try {
      //@ts-ignore we check the factory in the constructor
      const promise = toSafePromise(this._factory.validate(object));
      // keeps track of how many objects are being validated and can be used with Promise.all
      this._validatePromises.add(promise);
      const { result: isValid, error } = await promise;
      this._validatePromises.delete(promise);
      if (error) throw error;
      return !!isValid;
    } catch (error) {
      /**
       * An error occurred while trying to validate an object. Likely an error from factory.validate
       * @event Pool#factoryValidateError
       * @param {Error} error The error that occurred
       */
      this.emit(PoolEvents.VALIDATE_ERROR, error);
      // because there was an error, we consider the object invalid
      return false;
    }
  }

  /**
   * Creates an error based on the pools current state
   * @returns {TypeError} Error for the pools current state
   */
  _getStateError() {
    if (this._state < PoolStates.STARTED) return new TypeError(ErrorMessages.POOL_NOT_STARTED);
    if (this._state === PoolStates.SHUTTING_DOWN) return new TypeError(ErrorMessages.IS_SHUTTING_DOWN);
    if (this._state === PoolStates.STOPPED) return new TypeError(ErrorMessages.IS_STOPPED);
    /* ignore coverage: shouldn't happen unless we call this while pool is running... which at the moment we don't... */
    return new TypeError(ErrorMessages.UNKNOWN_REJECTION);
  }

  /**
   * Removes request from queue if it times out
   * @param {PoolRequest<T>} request
   */
  async _handleRequestTimeout(request) {
    try {
      await request.getPromise();
    } catch (error) {
      if (error instanceof TimeoutError) this._requests.remove(request);
    }
  }

  /**
   * Does pool have maximum pending requests?
   * @returns {boolean}
   */
  _hasMaxPendingRequests() {
    // if maxPendingRequests is set to null there is no max... this is different than 0
    if (this._options.maxPendingRequests === null) return false;
    // if there are objects available or additional objects can be created we don't limit the request queue size
    if (this._available.length > 0 || this.getSize() < this._options.maxSize) return false;
    return this._requests.length >= this._options.maxPendingRequests;
  }

  /**
   *
   * Maintains the size of the pool and tries to dispatch objects to requests. This is the primary event cycle that keeps the pool running
   */
  _pump() {
    // important that this pump cycle avoids async unless validating... might do a diagram or something...
    this._ensureSize();
    if (this._requests.length > 0) this._dispatchAvailable();
  }

  /**
   * Starts the pool and creates enough objects to reach the minimum
   */
  async _start() {
    // call pump so that if there is a min size the objects start being created
    this._pump();
    // wait for any initial objects to be created
    await Promise.all(this._createPromises);
    this._scheduleIdleObjectCheck();
    this._state = PoolStates.STARTED;

    /**
     * Pool has started and initial objects have been created to reach the minimum pool size
     * @event Pool#poolDidStart
     */
    // should we attach anything to this event? and should we possibly emit events on the next loop?
    this.emit(PoolEvents.STARTED);
  }

  /**
   * Stops the pool and destroys all objects
   */
  async _stop() {
    // do we have to wait for any create promises as well?
    this._cancelNextIdleObjectCheck();
    // wait for outstanding requests to be fulfilled... could add an option to reject these requests ie. pool.forceStop()...
    const outstandingRequests = [...this._requests].map(request => toSafePromise(request.getPromise()));
    await Promise.all(outstandingRequests);
    // now that there are no more requests, destroy remaining available objects
    await this.clear();
    // wait for any objects to be returned
    const outstandingLoans = [...this._borrowed].map(pooledObject => pooledObject.getLoanPromise());
    await Promise.all(outstandingLoans);
    // wait for the returned objects to finish validating if shouldValidateOnReturn is enabled
    await Promise.all(this._validatePromises);
    // destroy remaining objects
    await this.clear();
    this._state = PoolStates.STOPPED;
    /**
     * Pool has stopped and all objects have been destroyed
     * @event Pool#poolDidStop
     */
    // should we attach anything to this event? and should we possibly emit events on the next loop?
    this.emit(PoolEvents.STOPPED);
  }

  /**
   * Checks if the object is valid. If it is valid it will be made available else it will be destroyed. Used when `shouldValidateOnReturn` is enabled
   * @param {PooledObject<T>} pooledObject The object to validate
   */
  async _validateThenAddToAvailableOrDestroy(pooledObject) {
    pooledObject.setToValidating();
    // keeps track of how many objects are being validated for return
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

  /**
   * Checks if the object is valid. If it is valid it will be dispatched to a request else it will be destroyed. Used when `shouldValidateOnDispatch` is enabled
   * @param {PooledObject<T>} pooledObject The object to validate
   */
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
   * Request an object from the Pool. If no objects are available and the pool is below the maximum size, a new one will be created
   *
   * @example
   * const thingy = await pool.acquire()
   *
   * // With custom priority
   * const thingy = await pool.acquire({ priority: 5 })
   *
   * // With custom timeout
   * const thingy = await pool.acquire({ timeoutInMs: 5000 })
   *
   * // With custom priority and timeout
   * const thingy = await pool.acquire({ priority: 10, timeoutInMs: 1000 })
   *
   *
   * @param {Object} [options]
   * @param {number} [options.priority=0] The priority for the request. The higher the number the higher the priority
   * @param {number|null} [options.timeoutInMs=30000] Time in milliseconds before the request times out
   * @returns {Promise<T>}
   */
  async acquire({ priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    if (this._state === PoolStates.CREATED) this.start();
    if (this._state >= PoolStates.SHUTTING_DOWN) throw this._getStateError();
    if (this._hasMaxPendingRequests()) return this._acquireNextLoop({ priority, timeoutInMs });
    return this._newRequest({ priority, timeoutInMs });
  }

  /**
   * Destroys all pooled objects that are currently available. Resolves after objects have been destroyed
   *
   * @example
   * pool.getInfo() // { size: 5, available: 2, borrowed: 3, ...moreInfo }
   * await pool.clear()
   * pool.getInfo() // { size: 3, available: 0, borrowed: 3, ...moreInfo }
   *
   * @returns {Promise<void>}
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
   * @alias PoolInfo
   * @property {number} available Number of objects that are available for requests
   * @property {number} beingCreated Number of objects being created
   * @property {number} beingDestroyed Number of objects being destroyed. Not included in the total pool size
   * @property {number} beingValidated Number of objects being validated. The sum of beingValidatedForDispatch and beingValidatedForReturn
   * @property {number} beingValidatedForDispatch Number of objects being validated before attempting to dispatch to a request
   * @property {number} beingValidatedForReturn Number of objects being validated before being returned to available objects
   * @property {number} pendingRequests Number of requests waiting for an object
   * @property {number} borrowed Number of objects currently borrowed
   * @property {number} notBorrowed Number of objects not currently borrowed
   * @property {number} size Total number of objects in the pool. Includes objects being created and excludes objects being destroyed
   * @property {string} state The current pool state
   * @memberof Pool
   */

  /**
   * Current pool object counts and state
   * @example
   * pool.getInfo().available // 2
   * // or
   * const { available, borrowed, size, state } = pool.getInfo()
   *
   * @returns {PoolInfo}
   */
  getInfo() {
    const size = this._pooledObjects.size + this._createPromises.size;
    const notBorrowed = size - this._borrowed.size;
    return {
      available: this._available.length,
      beingCreated: this._createPromises.size,
      beingDestroyed: this._destroyPromises.size,
      beingValidated: this._validatePromises.size,
      beingValidatedForDispatch: this._beingValidatedForDispatch.size,
      beingValidatedForReturn: this._beingValidatedForReturn.size,
      borrowed: this._borrowed.size,
      pendingRequests: this._requests.length,
      state: PoolStates[this._state],
      notBorrowed,
      size,
    };
  }

  /**
   * Current pool options
   * @example
   * pool.getOptions().defaultTimeoutInMs // 30000
   * // or
   * const { maxSize, maxPendingRequests } = pool.getOptions()
   * @returns {Options}
   * @readonly
   */
  getOptions() {
    return { ...this._options };
  }

  /**
   * Total number of objects in the pool. Includes objects being created and excludes objects being destroyed
   * @example
   * pool.getSize() // 3
   * @returns {number}
   */
  getSize() {
    return this._pooledObjects.size + this._createPromises.size;
  }

  /**
   * Current pool state as a string
   * @example
   * pool.getState() // 'STARTED'
   * @returns {PoolState}
   */
  getState() {
    return PoolStates[this._state];
  }

  /**
   * Checks if the object is part of the pool
   * @example
   * pool.has(thingy) // true
   * @param {T} object The object to check
   * @returns {boolean}
   */
  has(object) {
    return this._pooledObjects.has(object);
  }

  /**
   * Checks if the object is currently borrowed
   * @example
   * pool.isBorrowed(thingy) // true
   * @param {T} object The object to check
   * @returns {boolean}
   */
  isBorrowed(object) {
    // should objects that are not pooled just return false? i think so...
    const pooledObject = this._pooledObjects.get(object);
    if (!pooledObject) return false;
    return this._borrowed.has(pooledObject);
  }

  /**
   * Returns the object back to the pool for future use
   * @example
   * const thingy = await pool.acquire()
   * pool.getInfo() // { size: 5, available: 2, borrowed: 3, ...moreInfo }
   * const result = await thingy.doSomethingAsync()
   * await pool.release(thingy)
   * pool.getInfo() // { size: 5, available: 3, borrowed: 2, ...moreInfo }
   * @param {T} object The object to return
   * @returns {Promise<void>}
   */
  async release(object) {
    const pooledObject = this._pooledObjects.get(object);
    if (!pooledObject) throw new ReferenceError(ErrorMessages.NOT_IN_POOL);
    // if the object is not currently borrowed setToReturned() should throw... doing it this way to avoid checking in multiple places...
    pooledObject.setToReturned();
    this._borrowed.delete(pooledObject);
    if (this._options.shouldValidateOnReturn) {
      // should we wait for this? don't really think so...
      await this._validateThenAddToAvailableOrDestroy(pooledObject);
    } else {
      this._addToAvailable(pooledObject);
    }
  }

  /**
   * Returns the object to the pool and destroys it
   * @example
   * const thingy = await pool.acquire()
   * pool.getInfo() // { size: 5, available: 2, borrowed: 3, ...moreInfo }
   * const result = await thingy.doSomethingAsync()
   * await pool.releaseAndDestroy(thingy)
   * pool.getInfo() // { size: 4, available: 2, borrowed: 2, ...moreInfo }
   * @param {T} object The object to return and destroy
   * @returns {Promise<void>}
   */
  async releaseAndDestroy(object) {
    const pooledObject = this._pooledObjects.get(object);
    if (!pooledObject) throw new ReferenceError(ErrorMessages.NOT_IN_POOL);
    pooledObject.setToReturned();
    this._borrowed.delete(pooledObject);
    const destroyPromise = this._destroy(pooledObject);
    this._pump();
    // not sure if it's a good idea to wait for this... when would we need to know if the object was destroyed before continuing something?
    await destroyPromise;
  }

  /**
   * Starts the pool
   * @example
   * await pool.start()
   * const thingy = await pool.acquire()
   * @returns {Promise<void>} Resolves after pool is started
   */
  start() {
    if (this._state >= PoolStates.SHUTTING_DOWN) return Promise.reject(this._getStateError());
    // this is so multiple calls can be made to start that resolve at the some time and _start is only called once
    if (this._state >= PoolStates.STARTING) return this._startPromise;
    this._state = PoolStates.STARTING;
    this._startPromise = this._start();
    return this._startPromise;
  }

  /**
   * Stops the pool
   * @example
   * const thingy = await pool.acquire()
   * const finalResult = await thingy.doSomethingAsync()
   * pool.release(thingy)
   * pool.stop()
   * @returns {Promise<void>} Resolves after pool is stopped
   */
  stop() {
    if (this._state < PoolStates.STARTED) return Promise.reject(this._getStateError());
    // this is so multiple calls can be made to stop that resolve at the some time and _stop is only called once
    if (this._state >= PoolStates.SHUTTING_DOWN) return this._stopPromise;
    this._state = PoolStates.SHUTTING_DOWN;
    this._stopPromise = this._stop();
    return this._stopPromise;
  }

  /**
   * Use a pooled object with a callback and release to object automatically
   *
   * @example
   * const result = await pool.use(thingy => thingy.doSomethingAsync())
   *
   * @param {function} callback
   * @param {Object} [options]
   * @param {number} [options.priority=0] The priority for the request. The higher the number the higher the priority
   * @param {number|null} [options.timeoutInMs=30000] Time in milliseconds before the request times out
   * @returns {Promise<any>} Result from callback
   */
  async use(callback, { priority = 0, timeoutInMs = this._options.defaultTimeoutInMs } = {}) {
    if (typeof callback !== 'function') throw TypeError(ErrorMessages.CALLBACK_MUST_BE_FUNCTION);
    // if this throws the caller of use will received the error
    const object = await this.acquire({ priority, timeoutInMs });
    try {
      const result = await callback(object);
      // need to check this release... if the pool gets stopped or something, where should the error go? we have a result and someone waiting for it...
      // not using a safe promise here either... i don't want to add an extra promise if it's not needed
      this.release(object).catch(doNothing);
      return result;
    } catch (error) {
      this.release(object).catch(doNothing);
      throw error;
    }
  }
}

module.exports = Pool;
