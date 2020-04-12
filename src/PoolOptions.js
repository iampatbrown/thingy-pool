const { ErrorMessages } = require('./errors');
const { toInt, toNullableInt, toBoolean } = require('./utils');

/**
 * @typedef Options
 * @property {number} [minSize=0] The minimum number of objects the pool will try to maintain regardless of requests
 * @property {number} [maxSize=1] The maximum number of objects the pool can hold
 * @property {number|null} [defaultTimeoutInMs=30000] The default time in milliseconds before calls to acquire and use will reject due to time out
 * @property {number|null} [maxPendingRequests=null] The number of requests that can be made if the pool has no objects available and is at maximum size.
 * ie. the number of requests that the pool can queue that are waiting for an object to be returned
 * @property {number|null} [evictionIntervalInMs=null] The interval between eviction runs
 * @property {number|null} [testsPerEviction=null] The number of objects that are checked per eviction.
 * @property {number|null} [minIdleTime=null] The amount of time an object must be idle before being eligible for soft eviction. If an object is checked
 * exceeding this idle time and the available objects is currently above the minimum pool size it will be
 * destroyed
 * @property {number|null} [maxIdleTime=30000] The amount of time an object must be idle before being eligible for forced eviction. If an object is checked
 * exceeding this idle time it will be destroyed regardless of minimum pool size. If destroying the object would
 * bring the pool below the minimum, a new object will be created.
 * @property {boolean} [shouldAutoStart=true] If enabled pool will start automatically
 * @property {boolean} [shouldValidateOnDispatch=false] If enabled the pool will run factory.validate on the object before dispatching it for use. If validation
 * fails the invalid object will be destroyed and the pool will attempt to dispatch another pooled object, creating
 * one if required
 * @property {boolean} [shouldValidateOnReturn=false] If enabled pool will run factory.validate on the object before adding it back to the available objects. If
 * validation fails, the invalid object will be destroyed. If destroying the object would bring the pool below the
 * minimum, a new object will be created.
 *
 * @property {boolean} [shouldUseFifo=true] Determines the order objects are dispatched. Either First in First out or Last in First out. TODO: explain this
 */

/** @type {Options} */
class PoolOptions {
  /**
   *Creates an instance of PoolOptions.
   * @param {Options} [options={}]
   */
  constructor(options = {}) {
    this.minSize = 0;
    this.maxSize = 1;
    this.defaultTimeoutInMs = 30000;
    this.maxPendingRequests = null;
    this.evictionIntervalInMs = null;
    this.testsPerEviction = null;
    this.minIdleTime = null;
    this.maxIdleTime = 30000;
    this.shouldAutoStart = true;
    this.shouldValidateOnDispatch = false;
    this.shouldValidateOnReturn = false;
    this.shouldUseFifo = true;
    this.set(options);
  }

  /**
   *
   * Set options to given values
   * @param {Options} [options={}]
   * @returns {this}
   */
  set(options = {}) {
    if (!options || typeof options !== 'object') return this;
    // parse and merge given values with current options
    const merged = { ...this };

    Object.entries(options).forEach(([option, value]) => {
      if (value !== undefined) merged[option] = PoolOptions.parse(option, value);
    });

    // if no maxSize provided and the new minSize is above the current maxSize adjust the merged value
    if (options.maxSize === undefined && merged.minSize > merged.maxSize) merged.maxSize = merged.minSize;
    // if no minSize provided and the new maxSize is below the current minSize adjust the merged value
    if (options.minSize === undefined && merged.minSize > merged.maxSize) merged.minSize = merged.maxSize;
    // if minSize and maxSize were both provided and minSize is above max this will throw
    if (merged.minSize > merged.maxSize) throw new RangeError(ErrorMessages.MIN_ABOVE_MAX);

    // ensure at least one idleTime is set if evictor is enabled
    if (merged.evictionIntervalInMs && !merged.minIdleTime && !merged.maxIdleTime) {
      throw new ReferenceError(ErrorMessages.EVICT_NEEDS_MIN_OR_MAX_IDLE);
    }

    // after all checks have passed we can update the options
    Object.assign(this, merged);
    return this;
  }

  static parse(option, value) {
    switch (option) {
      case 'minSize':
        return toInt(value, option, { min: 0 });
      case 'maxSize':
        return toInt(value, option, { min: 1 });
      case 'maxPendingRequests':
        return toNullableInt(value, option, { min: 0 });
      case 'defaultTimeoutInMs':
      case 'evictionIntervalInMs':
      case 'testsPerEviction':
      case 'minIdleTime':
      case 'maxIdleTime':
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
