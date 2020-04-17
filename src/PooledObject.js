const { ObjectStates } = require('./constants');
const { ErrorMessages } = require('./errors');

/**
 * A wrapped object with an updatable state
 * @example
 * // Create a pooled object and changes it's state to AVAILABLE
 * const thingy = new Thingy()
 * const pooledObject = new PooledObject(thingy)
 * pooledObject.setToAvailable()
 *
 * @template {object} T
 */
class PooledObject {
  /**
   * @param {T} object The object being pooled
   * @param {function():number} [getTimestamp=Date.now] Function to get the current timestamp. See [Date.now()]{@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now}
   */
  constructor(object, getTimestamp = Date.now) {
    if (!object || typeof object !== 'object') throw new TypeError(ErrorMessages.NO_OBJECT);

    /**
     * Function to get the current timestamp
     * @type {function():number}
     */
    this._getTimestamp = getTimestamp;

    /**
     * The wrapped object
     * @type {T}
     */
    this._object = object;

    /**
     * The current object state
     * @type {number}
     */
    this._state = ObjectStates.CREATED;

    /**
     * Timestamp for when the object was created
     * @type {number}
     */
    this._createdAt = this._getTimestamp();

    /**
     * Timestamp for last time state was changed to `AVAILABLE`
     * @type {number}
     */
    this._availableAt = 0;

    /**
     * Timestamp for last time state was changed to `BORROWED`
     * @type {number}
     */
    this._borrowedAt = 0;

    /**
     * Promise attached to the pooled object when it is borrowed representing a loan
     * @type {Promise<void>}
     */
    //@ts-ignore
    this._loanPromise = null;

    /**
     * Promise resolve function to be called when the pooled object is returned
     * @type {function}
     */
    //@ts-ignore
    this._loanResolve = null;
  }

  /**
   * Changes state to `AVAILABLE`
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
   * Changes state to `BORROWED` and attaches a promise to the pooled object which gets resolved on setToReturned
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
   * Changes state to `RETURNED` and resolves the loan promise
   * @returns {this}
   */
  setToReturned() {
    if (this._state !== ObjectStates.BORROWED) throw new TypeError(ErrorMessages.CANT_RETURN_NOT_BORROWED);
    this._loanResolve();
    this._state = ObjectStates.RETURNED;
    return this;
  }

  /**
   * Changes state to `VALIDATING`
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
   * Changes state to `INVALID`
   * @returns {this}
   */
  setToInvalid() {
    if (this._state === ObjectStates.DESTROYED) throw new TypeError(ErrorMessages.OBJECT_IS_DESTROYED);
    this._state = ObjectStates.INVALID;
    return this;
  }

  /**
   * Changes state to `DESTROYED`
   * @returns {this}
   */

  setToDestroyed() {
    this._state = ObjectStates.DESTROYED;
    return this;
  }

  /**
   * The object that is pooled
   * @returns {T}
   */
  getObject() {
    return this._object;
  }

  /**
   * Current state of the pooled object
   * @returns {ObjectState}
   */
  getState() {
    return ObjectStates[this._state];
  }

  /**
   * Promise that will be resolved when object gets returned. Returns `null` if not `BORROWED`
   * @returns {Promise<void>|null}
   */
  getLoanPromise() {
    if (this._state !== ObjectStates.BORROWED) return null;
    return this._loanPromise;
  }

  /**
   * The number of milliseconds since set to `AVAILABLE`. Returns `-1` if not `AVAILABLE`
   * @returns {number}
   */
  getIdleTime() {
    if (this._state !== ObjectStates.AVAILABLE) return -1;
    return this._getTimestamp() - this._availableAt;
  }
}

module.exports = PooledObject;
