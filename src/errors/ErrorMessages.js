const ErrorMessages = {
  CALLBACK_MUST_BE_FUNCTION: 'Callback must be a function',
  CANT_BORROW_NOT_AVAILABLE: 'Unable to borrow object that is not available',
  CANT_RETURN_NOT_BORROWED: 'Unable to return object that is not borrowed',
  CANT_VALIDATE_BORROWED: 'Unable to validate object that is borrowed',
  IDLE_CHECK_NEEDS_SOFT_OR_HARD_TIME: 'evictionIntervalInMs must be set with minIdleTime and/or maxIdleTime',
  IS_SHUTTING_DOWN: 'Pool is shutting down',
  IS_STOPPED: 'Pool is stopped',
  MAX_REQUESTS: 'Pool has max pending requests',
  MIN_ABOVE_MAX: 'minSize cannot be greater than maxSize',
  MUST_RETURN_BEFORE_AVAILABLE: 'Object must be returned before it can be made available',
  NOT_IN_POOL: 'Object not in pool',
  NO_OBJECT: 'Object must be defined',
  OBJECT_IS_DESTROYED: 'Object is destroyed',
  OBJECT_IS_INVALID: 'Object is invalid',
  POOL_NOT_STARTED: 'Pool has not been started',
  REQUEST_DID_TIMEOUT: 'Request has timed out',
  UNKNOWN_REJECTION: 'Unknown Rejection',
};

module.exports = ErrorMessages;
