const { ErrorMessages } = require('./errors');
const { toInt, toNullableInt, toBoolean } = require('./utils');

/**
 * @interface Options
 * @property {number} [minSize=0] The minimum number of objects the pool will try to maintain including borrowed objects. Cannot be greater than given maxSize. If this value is given without
 * a maxSize, maxSize will be adjusted if needed
 * @property {number} [maxSize=1] The maximum number of objects the pool can manage including objects being created. Cannot be less than given minSize. If this value is given without
 * a minSize, minSize will be adjusted if needed
 * @property {number|null} [defaultTimeoutInMs=30000] The default time in milliseconds calls to {@link Pool#acquire|pool.acquire()} and {@link Pool#use|pool.use()} will time out
 * @property {number|null} [maxPendingRequests=null] The number of requests that can be queued if the pool is at maximum size and has no objects available.
 * ie. the max number of requests waiting for an object to be returned. Note: Setting maxPendingRequests to `null` will disable maxPendingRequests which is different
 * from setting it to `0` which not allow any requests to be queued when the pool does not have any objects available
 * @property {number|null} [checkIdleIntervalInMs=null] The interval the pool checks for and removes idle objects
 * @property {number|null} [maxIdleToRemove=null] The max objects that can be removed when the pool checks for idle objects
 * @property {number|null} [softIdleTimeInMs=null] The amount of time an object must be idle before being eligible for soft removal. If an object is checked
 * and exceeds this time it will be destroyed if the currently available objects is above the minimum
 * @property {number|null} [hardIdleTimeInMs=30000] The amount of time an object must be idle before being eligible for hard removal. If an object is checked
 * exceeding this idle time it will be destroyed. If destroying the object would bring the pool below the minimum, a new object will be created
 * @property {boolean} [shouldAutoStart=true] If true, pool will start automatically. If a minSize is set the pool will start creating objects before any requests
 * are made
 * @property {boolean} [shouldValidateOnDispatch=false] If `true`, pool will call {@link Factory#validate|factory.validate()} on objects before dispatching them for use. If validation
 * fails the invalid object will be destroyed and the pool will attempt to dispatch another pooled object, creating one if required
 * @property {boolean} [shouldValidateOnReturn=false] If `true`, pool will call {@link Factory#validate|factory.validate()} on objects before adding them back to the available objects. If
 * validation fails, the invalid object will be destroyed. If destroying the object would bring the pool below the minimum, a new object will be created.
 * @property {boolean} [shouldUseFifo=true] Determines the order objects are dispatched. Either First in, First out (FIFO) or Last in, First out (LIFO). By default,
 * the pool dispatches the object that has been available the longest, working like a queue (FIFO). Setting this option to `false` will dispatch the most recently returned
 * or created object, working like a stack (LIFO)
 */

/**
 * @private
 */
class PoolOptions {
  /**
   * Merges given options with defaults
   *
   * @example
   * const options = new PoolOptions({ minSize: 2, maxSize: 6, defaultTimeoutInMs: null, shouldValidateOnDispatch: true })
   * options // { minSize: 2, maxSize: 6, defaultTimeoutInMs: null, maxPendingRequests: null, ...otherOptions }
   *
   *
   * // Just giving maxSize will use the default minSize
   * new PoolOptions({ maxSize: 6 }) // { minSize: 0, maxSize: 6, ...otherOptions }
   *
   * // Just giving minSize will increase maxSize to the given minSize if needed
   * new PoolOptions({ minSize: 4 }) //  { minSize: 4, maxSize: 4, ...otherOptions }
   *
   * // If both are given and minSize is greater than maxSize it will result in an error
   * new PoolOptions({ minSize: 5, maxSize: 2 })  //  RangeError
   *
   * @param {Partial<Options>} [options={}]
   */
  constructor(options = {}) {
    // set default options
    this.minSize = 0;
    this.maxSize = 1;
    /** @type {number|null} */
    this.defaultTimeoutInMs = 30000;
    /** @type {number|null} */
    this.maxPendingRequests = null;
    /** @type {number|null} */
    this.checkIdleIntervalInMs = null;
    /** @type {number|null} */
    this.maxIdleToRemove = null;
    /** @type {number|null} */
    this.softIdleTimeInMs = null;
    /** @type {number|null} */
    this.hardIdleTimeInMs = 30000;
    this.shouldAutoStart = true;
    this.shouldValidateOnDispatch = false;
    this.shouldValidateOnReturn = false;
    this.shouldUseFifo = true;
    // merge given options with defaults
    this.set(options);
  }

  /**
   * Sets the pool options to the given values if valid
   * @example
   * options.set({ maxSize: 5 })
   * @param {Partial<Options>} [options={}]
   * @returns {this}
   */
  set(options = {}) {
    // prevents undefined values from overriding current. If given option is unknown parseOption should throw
    const merged = Object.entries(options).reduce((merged, [key, value]) => {
      if (value === undefined) return merged;
      return { ...merged, [key]: PoolOptions.parseOption(key, value) };
    }, this);

    // if no maxSize provided and the new minSize is above the current maxSize adjust the merged value
    if (options.maxSize === undefined && merged.minSize > merged.maxSize) merged.maxSize = merged.minSize;
    // if no minSize provided and the new maxSize is below the current minSize adjust the merged value
    if (options.minSize === undefined && merged.minSize > merged.maxSize) merged.minSize = merged.maxSize;
    // if minSize and maxSize were both provided and minSize is above maxSize this will throw
    if (merged.minSize > merged.maxSize) throw new RangeError(ErrorMessages.MIN_ABOVE_MAX);

    // ensure at least one of softIdleTimeInMs or hardIdleTimeInMs is set if checkIdleIntervalInMs is set
    if (merged.checkIdleIntervalInMs && !merged.softIdleTimeInMs && !merged.hardIdleTimeInMs) {
      throw new ReferenceError(ErrorMessages.IDLE_CHECK_NEEDS_SOFT_OR_HARD_TIME);
    }

    // update option values
    Object.assign(this, merged);
    return this;
  }

  /**
   * Ensures the given option value has correct type and range
   * @param {string} option
   * @param {*} value
   * @returns {number|boolean|null}
   */
  static parseOption(option, value) {
    switch (option) {
      case 'minSize':
        return toInt(value, option, { min: 0 });
      case 'maxSize':
        return toInt(value, option, { min: 1 });
      case 'maxPendingRequests':
        return toNullableInt(value, option, { min: 0 });
      case 'defaultTimeoutInMs':
      case 'checkIdleIntervalInMs':
      case 'maxIdleToRemove':
      case 'softIdleTimeInMs':
      case 'hardIdleTimeInMs':
        return toNullableInt(value, option, { min: 1 });
      case 'shouldAutoStart':
      case 'shouldValidateOnDispatch':
      case 'shouldValidateOnReturn':
      case 'shouldUseFifo':
        return toBoolean(value, option);
      default:
        throw new ReferenceError(`Unknown option ${option}`);
    }
  }
}

module.exports = PoolOptions;
