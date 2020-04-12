enum ErrorMessages {
  MUST_BE_RETURNED = 'Object must be returned before it can be made available',
  NO_OBJECT = 'Object must be defined',
  OBJECT_IS_INVALID = 'Object is invalid',
  OBJECT_IS_DESTROYED = 'Object is destroyed',
  CANT_BORROW = 'Unable to borrow object that is not available',
}

enum ObjectState {
  CREATED = 0,
  AVAILABLE = 1,
  RETURNED = 2,
  VALIDATING = 3,
  BORROWED = 4,
  INVALID = 5,
  DESTROYED = 6,
}

class PooledObject<T> {
  private _availableAt: number = 0;
  private _borrowedAt: number = 0;
  private _createdAt: number;
  private _loanPromise: Promise<void> | null = null;
  private _loanResolve: (() => void) | null = null;
  private _state: ObjectState = ObjectState.CREATED;
  private _object: T;
  private _getTimestamp: () => number;

  constructor(object: T, getTimestamp = Date.now) {
    if (!object || typeof object !== 'object') throw new TypeError();
    this._object = object;
    this._createdAt = getTimestamp();
    this._getTimestamp = getTimestamp;
  }

  setToAvailable(): this {
    if (this._state === ObjectState.AVAILABLE) return this;
    if (this._state >= ObjectState.BORROWED) {
      if (this._state === ObjectState.BORROWED) throw new TypeError();
      if (this._state === ObjectState.INVALID) throw new TypeError();
      throw new TypeError();
    }
    this._state = ObjectState.AVAILABLE;
    this._availableAt = this._getTimestamp();
    return this;
  }

  setToBorrowed(): this {
    if (this._state !== ObjectState.AVAILABLE) throw new TypeError();
    this._loanPromise = new Promise(resolve => {
      this._loanResolve = resolve;
    });
    this._state = ObjectState.BORROWED;
    this._borrowedAt = this._getTimestamp();
    return this;
  }

  setToReturned(): this {
    if (this._state !== ObjectState.BORROWED) throw new TypeError();
    // @ts-ignore _loanResolve should exist when state is borrowed
    this._loanResolve();
    this._state = ObjectState.RETURNED;
    return this;
  }

  setToValidating(): this {
    if (this._state >= ObjectState.BORROWED) {
      if (this._state === ObjectState.BORROWED) throw new TypeError();
      if (this._state === ObjectState.INVALID) throw new TypeError();
      throw new TypeError();
    }
    this._state = ObjectState.VALIDATING;
    return this;
  }

  setToInvalid(): this {
    if (this._state === ObjectState.DESTROYED) throw new TypeError();
    this._state = ObjectState.INVALID;
    return this;
  }

  setToDestroyed(): this {
    this._state = ObjectState.DESTROYED;
    return this;
  }

  getObject() {
    return this._object;
  }

  getState(): string {
    return ObjectState[this._state];
  }

  getLoanPromise() {
    return this._loanPromise;
  }

  getIdleTime(): number {
    if (this._state !== ObjectState.AVAILABLE) return -1;
    return this._getTimestamp() - this._availableAt;
  }
}

export default PooledObject;
