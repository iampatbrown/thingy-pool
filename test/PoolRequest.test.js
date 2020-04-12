const PoolRequest = require('../src/PoolRequest');
const { TimeoutError } = require('../src/errors');

const catchTimeout = promise => promise.catch(() => {});

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('PoolRequest', () => {
  describe('PoolRequest.constructor', () => {
    it('should create a new PoolRequest with no timeout', () => {
      expect(new PoolRequest().hasTimeout()).toBe(false);
    });

    it('should create a new PoolRequest with no timeout when given null', () => {
      expect(new PoolRequest(null).hasTimeout()).toBe(false);
    });

    it('should create a new PoolRequest with a timeout', () => {
      const request = new PoolRequest(1);
      expect(request.hasTimeout()).toBe(true);
      catchTimeout(request.getPromise());
    });

    it('should create a new PoolRequest with a timeout when given 0', () => {
      const request = new PoolRequest(0);

      expect(request.hasTimeout()).toBe(true);
      catchTimeout(request.getPromise());
    });
  });

  describe('PoolRequest.getPromise', () => {
    it('should return a promise', () => {
      expect(new PoolRequest().getPromise()).toBeInstanceOf(Promise);
    });
  });

  describe('PoolRequest.didTimeout', () => {
    it('should return false if request has no timeout', () => {
      expect(new PoolRequest().didTimeout()).toBe(false);
    });

    it('should return false if called before timeout', () => {
      const request = new PoolRequest(1);
      expect(request.didTimeout()).toBe(false);
      catchTimeout(request.getPromise());
    });

    it('should return true if called after timeout', () => {
      const request = new PoolRequest(1);
      expect(request.didTimeout()).toBe(false);
      catchTimeout(request.getPromise());
      jest.advanceTimersByTime(1);
      expect(request.didTimeout()).toBe(true);
    });
  });

  describe('PoolRequest.hasTimeout', () => {
    it('should return false if request has no timeout', () => {
      expect(new PoolRequest().hasTimeout()).toBe(false);
    });

    it('should return true if called before timeout', () => {
      const request = new PoolRequest(1);
      expect(request.hasTimeout()).toBe(true);
      catchTimeout(request.getPromise());
    });

    it('should return true if called after timeout', () => {
      const request = new PoolRequest(1);
      expect(request.hasTimeout()).toBe(true);
      catchTimeout(request.getPromise());
      jest.advanceTimersByTime(1);
      expect(request.hasTimeout()).toBe(true);
    });
  });

  describe('PoolRequest.resolve', () => {
    it('should fulfill request promise', async () => {
      expect.assertions(1);
      const request = new PoolRequest();
      request.resolve('FULFILLED');
      await expect(request.getPromise()).resolves.toEqual('FULFILLED');
    });

    it('should be ignored if request already resolved', async () => {
      expect.assertions(1);
      const request = new PoolRequest();
      request.resolve('FIRST');
      request.resolve('SECOND');
      await expect(request.getPromise()).resolves.toEqual('FIRST');
    });

    it('should be ignored if request already rejected', async () => {
      expect.assertions(1);
      const request = new PoolRequest();
      request.reject('REJECTED');
      request.resolve('FULFILLED');
      await expect(request.getPromise()).rejects.toEqual('REJECTED');
    });

    it('should be ignored if called after timeout', async () => {
      expect.assertions(2);
      const request = new PoolRequest(1);
      catchTimeout(request.getPromise());
      jest.advanceTimersByTime(1);
      expect(request.didTimeout()).toBe(true);
      request.resolve('FULFILLED');
      await expect(request.getPromise()).rejects.toBeInstanceOf(TimeoutError);
    });
  });

  describe('PoolRequest.reject', () => {
    it('should reject request promise', async () => {
      expect.assertions(1);
      const request = new PoolRequest();
      request.reject('REJECTED');
      await expect(request.getPromise()).rejects.toEqual('REJECTED');
    });

    it('should be ignored if request already resolved', async () => {
      expect.assertions(1);
      const request = new PoolRequest();
      request.resolve('FULFILLED');
      request.reject('REJECTED');
      await expect(request.getPromise()).resolves.toEqual('FULFILLED');
    });

    it('should be ignored if request already rejected', async () => {
      expect.assertions(1);
      const request = new PoolRequest();
      request.reject('FIRST');
      request.reject('SECOND');
      await expect(request.getPromise()).rejects.toEqual('FIRST');
    });

    it('should be ignored if called after timeout', async () => {
      expect.assertions(2);
      const request = new PoolRequest(1);
      catchTimeout(request.getPromise());
      jest.advanceTimersByTime(1);
      expect(request.didTimeout()).toBe(true);
      request.reject('FULFILLED');
      await expect(request.getPromise()).rejects.toBeInstanceOf(TimeoutError);
    });
  });
});
