type PoolState = 'CREATED' | 'STARTING' | 'STARTED' | 'SHUTTING_DOWN' | 'STOPPED';

type ObjectState = 'CREATED' | 'AVAILABLE' | 'RETURNED' | 'VALIDATING' | 'BORROWED' | 'INVALID' | 'DESTROYED';

type PoolEvent = 'poolDidStart' | 'poolDidStop' | 'factoryCreateError' | 'factoryValidateError' | 'factoryDestroyError';

interface Factory<T extends Object> {
  create(): Promise<T> | T;
  destroy(object: T): Promise<void> | void;
  validate?(object: T): Promise<boolean> | boolean;
}

interface Options {
  /** The minimum number of objects the pool will try to maintain including borrowed objects */
  minSize: number;
  /** The maximum number of objects the pool can manage including objects being created */
  maxSize: number;
  /** The default time in milliseconds object requests will time out */
  defaultTimeoutInMs: number | null;
  /** The number of requests that can be queued if the pool is at the maximum size and has no objects available */
  maxPendingRequests: number | null;
  /** The interval the pool checks for and removes idle objects */
  checkIdleIntervalInMs: number | null;
  /** The max objects that can be removed each time the pool checks for idle objects */
  maxIdleToRemove: number | null;
  /** The amount of time an object must be idle before being eligible for soft removal */
  softIdleTimeInMs: number | null;
  /** The amount of time an object must be idle before being eligible for hard removal */
  hardIdleTimeInMs: number | null;
  /** Should the pool start creating objects to reach the minimum size as soon as it is created? */
  shouldAutoStart: boolean;
  /** Should the pool check objects with factory.validate before dispatching them to requests? */
  shouldValidateOnDispatch: boolean;
  /** Should the pool check objects with factory.validate when they are being returned? */
  shouldValidateOnReturn: boolean;
  /** Should the pool dispatch objects using first in first out (FIFO)? */
  shouldUseFifo: boolean;
}

interface ObjectQueue<T extends Object> {
  length: number;
  peek(): T | undefined;
  pop(): T | undefined;
  push(item: T): number;
  shift(): T | undefined;
}

interface RequestQueue<T extends Object> extends Iterable<T> {
  length: number;
  enqueue(item: T, priority: number): number;
  dequeue(): T | undefined;
  remove(item: T): boolean;
}

interface Injectables<T extends Object> {
  objectQueue?: ObjectQueue<PooledObject<T>>;
  requestQueue?: RequestQueue<PoolRequest<T>>;
  getTimestamp?(): number;
}

interface RequestOptions {
  /** The priority for the request. The higher the number the higher the priority */
  priority?: number;
  /** Time in milliseconds before the request times out */
  timeoutInMs?: number | null;
}

interface PoolInfo {
  /** Number of objects that a available for requests */
  available: number;
  /** Number of objects being created */
  beingCreated: number;
  /** Number of objects being destroyed. Not included in the total pool size */
  beingDestroyed: number;
  /** Number of objects being validated. The sum of beingValidatedForDispatch and beingValidatedForReturn */
  beingValidated: number;
  /** Number of objects being validated before attempting to dispatch to a request */
  beingValidatedForDispatch: number;
  /** Number of objects being validated before being returned to available objects */
  beingValidatedForReturn: number;
  /** Number of requests waiting for an object */
  pendingRequests: number;
  /** Number of objects currently borrowed */
  borrowed: number;
  /** Number of objects not currently borrowed */
  notBorrowed: number;
  /**  Total number of objects in the pool. Includes objects being created and excludes objects being destroyed */
  size: number;
  /**  The current pool state */
  state: PoolState;
}

declare class PooledObject<T extends Object> {
  constructor(object: T, getTimestamp?: () => number);
  setToAvailable(): void;
  setToBorrowed(): void;
  setToReturned(): void;
  setToValidating(): void;
  setToInvalid(): void;
  setToDestroyed(): void;
  getObject(): T;
  getState(): ObjectState;
  getLoanPromise(): Promise<void> | null;
  getIdleTime(): number;
}

declare class PoolRequest<T extends Object> {
  constructor(timeoutInMs?: number | null, getTimestamp?: () => number);
  didTimeout(): boolean;
  getPromise(): Promise<T>;
  hasTimeout(): boolean;
  reject(reason: Error): void;
  resolve(object: T): void;
}

interface SafePromiseResult<T> {
  result: T;
  error?: undefined;
}
interface SafePromiseError {
  result?: undefined;
  error: Error;
}

type SafePromise<T> = Promise<SafePromiseResult<T> | SafePromiseError>;

interface IntegerRange {
  min?: number;
  max?: number;
}

declare class Pool<T extends Object> {
  constructor(factory: Factory<T>, options: Partial<Options>, injectables: Injectables<T>);
  /** Request an object from the Pool. If no objects are available and the pool is below the maximum size, a new one will be created */
  acquire({ priority, timeoutInMs }?: RequestOptions): Promise<T>;
  /** Destroys all pooled objects that are currently available. Resolves after objects have been destroyed */
  clear(): Promise<void>;
  /** Object counts and pool state */
  getInfo(): PoolInfo;
  /** Current pool options */
  getOptions(): Options;
  /**  Total number of objects in the pool. Includes objects being created and excludes objects being destroyed */
  getSize(): number;
  /** Current pool state */
  getState(): PoolState;
  /** Checks if the object is part of the pool */
  has(object: T): boolean;
  /** Checks if the object is currently borrowed */
  isBorrowed(object: T): boolean;
  /** Returns the object back to the pool for future use */
  release(object: T): Promise<void>;
  /** Returns the object to the pool and destroys it */
  releaseAndDestroy(object: T): Promise<void>;
  /** Starts the pool */
  start(): Promise<void>;
  /** Stops the pool */
  stop(): Promise<void>;
  /** Use a pooled object with a callback. Acquires and release the object automatically */
  use<R>(callback: (item: T) => R, { priority, timeoutInMs }?: RequestOptions): Promise<R>;
  /**  */
  on(event: PoolEvent, listener: (...args: any[]) => void): this;
}
