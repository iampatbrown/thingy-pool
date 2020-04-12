const { ObjectStates } = require('./constants');
const { ErrorMessages } = require('./errors');

/**
 * A wrapped object with an updatable state
 * @template T
 * @private
 */
class PooledObject {
  /**
   *Creates an instance of PooledObject.
   * @param {T} object
   * @param {function():number} [getTimestamp=Date.now] Mainly used for testing. See [Date.now()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now}
   */
  constructor(object, getTimestamp = Date.now) {
    if (!object || typeof object !== 'object') throw new TypeError(ErrorMessages.NO_OBJECT);
    this._getTimestamp = getTimestamp;

    /** The pooled object */
    this._object = object;

    /**
     * The current object state
     * @type {number}
     */
    this._state = ObjectStates.CREATED;

    /** Timestamp for when the object was created */
    this._createdAt = this._getTimestamp();

    /** Timestamp for when the object was last set to available */
    this._availableAt = 0;

    /** Timestamp for when the object was last set to borrowed */
    this._borrowedAt = 0;

    /**
     * @type {Promise}
     */
    this._loanPromise = null;

    /**
     * funtion that resolves the promise representing the loan for the object
     * @type {function}
     */
    this._loanResolve = null;
  }

  /**
   * Changes state to AVAILABLE
   * Valid previous states: CREATED, VALIDATING, RETURNED
   * @returns {this}
   */
  setToAvailable() {
    if (this._state === ObjectStates.AVAILABLE) return this;
    if (this._state >= ObjectStates.BORROWED) {
      if (this._state === ObjectStates.BORROWED) throw new TypeError(ErrorMessages.MUST_RETURN_BEFORE_AVAILABLE);
      if (this._state === ObjectStates.INVALID) throw new TypeError(ErrorMessages.OBJECT_IS_INVALID);
      throw new TypeError(ErrorMessages.OBJECT_IS_DESTROYED);
    }
    this._state = ObjectStates.AVAILABLE;
    this._availableAt = this._getTimestamp();
    return this;
  }

  /**
   * Changes state to BORROWED and adds a promise to the pooled object which gets resolved on return.
   * Valid previous states: AVAILABLE
   * @returns {this}
   */
  setToBorrowed() {
    if (this._state !== ObjectStates.AVAILABLE) throw new TypeError(ErrorMessages.CANT_BORROW_NOT_AVAILABLE);
    this._loanPromise = new Promise(resolve => {
      this._loanResolve = resolve;
    });
    this._state = ObjectStates.BORROWED;
    this._borrowedAt = this._getTimestamp();
    return this;
  }

  /**
   * Changes state to RETURNED and resolves the stored promise
   * Valid previous states: BORROWED
   * @returns {this}
   */
  setToReturned() {
    if (this._state !== ObjectStates.BORROWED) throw new TypeError(ErrorMessages.CANT_RETURN_NOT_BORROWED);
    this._loanResolve();
    this._state = ObjectStates.RETURNED;
    return this;
  }

  /**
   * Changes state to VALIDATING
   * Valid previous states: CREATED, AVAILABLE, RETURNED
   * @returns {this}
   */
  setToValidating() {
    if (this._state >= ObjectStates.BORROWED) {
      if (this._state === ObjectStates.BORROWED) throw new TypeError(ErrorMessages.CANT_VALIDATE_BORROWED);
      if (this._state === ObjectStates.INVALID) throw new TypeError(ErrorMessages.OBJECT_IS_INVALID);
      throw new TypeError(ErrorMessages.OBJECT_IS_DESTROYED);
    }
    this._state = ObjectStates.VALIDATING;
    return this;
  }

  /**
   *
   * Changes state to INVALID
   * Valid previous states: CREATED, AVAILABLE, RETURNED, BORROWED, VALIDATING
   * @returns {this}
   */
  setToInvalid() {
    if (this._state === ObjectStates.DESTROYED) throw new TypeError(ErrorMessages.OBJECT_IS_DESTROYED);
    this._state = ObjectStates.INVALID;
    return this;
  }

  /**
   *
   * Changes state to DESTROYED
   * Valid previous states: CREATED, AVAILABLE, RETURNED, BORROWED, VALIDATING, INVALID
   * @returns {this}
   */

  setToDestroyed() {
    this._state = ObjectStates.DESTROYED;
    return this;
  }

  /**
   * The object that is pooled
   * @returns {object}
   */
  getObject() {
    return this._object;
  }

  /**
   * Current state of the pooled object
   * @returns {ObjectState}
   */
  getState() {
    return Object.keys(ObjectStates).find(key => ObjectStates[key] === this._state);
  }

  /**
   * Promise that will be resolved when object is returned. Can be used for external tracking
   * @returns {Promise}
   */
  getLoanPromise() {
    return this._loanPromise;
  }

  /**
   * The number of milliseconds since set to AVAILABLE will return -1 if not AVAILABLE
   * @returns {number}
   */
  getIdleTime() {
    if (this._state !== ObjectStates.AVAILABLE) return -1;
    return this._getTimestamp() - this._availableAt;
  }
}

module.exports = PooledObject;
