enum ErrorMessages {
  UNKNOWN_REJECTION = 'Unknown Rejection',
  REQUEST_DID_TIMEOUT = 'Request has timed out',
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    Error.captureStackTrace(this, TimeoutError);
    this.name = 'TimeoutError';
  }
}

class PoolRequest<T> {
  private _getTimestamp: () => number;
  private _promise: Promise<T>;
  private _resolve: (object: T) => void;
  private _reject: (reason: Error) => void;
  private _timeoutAt: number | undefined;
  private _timeoutId: NodeJS.Timeout | undefined;

  constructor(timeoutInMs: number = null, getTimestamp = Date.now) {
    this._getTimestamp = getTimestamp;

    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });

    if (timeoutInMs !== null && timeoutInMs !== undefined) {
      this._timeoutId = setTimeout(() => this._handleTimeout(), timeoutInMs);
    }
  }

  resolve(object: T): void {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._resolve(object);
  }

  reject(reason = new Error(ErrorMessages.UNKNOWN_REJECTION)): void {
    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._reject(reason);
  }

  getPromise() {
    return this._promise;
  }

  hasTimeout() {
    return !!this._timeoutId;
  }

  didTimeout() {
    return !!this._timeoutAt;
  }

  private _handleTimeout() {
    this._timeoutAt = this._getTimestamp();
    this._reject(new TimeoutError(ErrorMessages.REQUEST_DID_TIMEOUT));
  }
}

export default PoolRequest;
