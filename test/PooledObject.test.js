const PooledObject = require('../src/PooledObject');

// Lots to clean up here

const newAvailableObject = () => new PooledObject({}).setToAvailable();
const newBorrowedObject = () => newAvailableObject().setToBorrowed();
const newReturnedObject = () => newBorrowedObject().setToReturned();
const newValidatingObject = () => new PooledObject({}).setToValidating();
const newInvalidObject = () => new PooledObject({}).setToInvalid();
const newDestroyedObject = () => new PooledObject({}).setToDestroyed();

describe('PooledObject', () => {
  describe('PooledObject.constructor', () => {
    it('should throw invalid object is provided', () => {
      expect(() => new PooledObject()).toThrowError(TypeError);
      expect(() => new PooledObject(false)).toThrowError(TypeError);
      expect(() => new PooledObject(true)).toThrowError(TypeError);
      expect(() => new PooledObject(null)).toThrowError(TypeError);
      expect(() => new PooledObject('string')).toThrowError(TypeError);
      expect(() => new PooledObject(7)).toThrowError(TypeError);
    });

    it('should create a new PooledObject', () => {
      expect(new PooledObject({})).toBeInstanceOf(PooledObject);
    });

    it('should create a new PooledObject in a Created State', () => {
      expect(new PooledObject({}).getState()).toBe('CREATED');
    });
  });

  describe('PooledObject.setToAvailable', () => {
    it('should return itself', () => {
      const object = new PooledObject({});
      expect(object.setToAvailable()).toBe(object);
    });

    it('should change to Available if state is Created', () => {
      const object = new PooledObject({});
      expect(object.getState()).toBe('CREATED');
      expect(object.setToAvailable().getState()).toBe('AVAILABLE');
    });

    it('should change to Available if state is Validating', () => {
      const object = new PooledObject({});
      expect(object.setToValidating().getState()).toBe('VALIDATING');
      expect(object.setToAvailable().getState()).toBe('AVAILABLE');
    });

    it('should throw if state is Borrowed', () => {
      const object = new PooledObject({}).setToAvailable().setToBorrowed();
      expect(object.getState()).toBe('BORROWED');
      expect(() => object.setToAvailable()).toThrowError(TypeError);
    });

    it('should throw if state is Invalid', () => {
      const object = new PooledObject({}).setToInvalid();
      expect(object.getState()).toBe('INVALID');
      expect(() => object.setToAvailable()).toThrowError(TypeError);
    });

    it('should throw if state is Destroyed', () => {
      const object = new PooledObject({}).setToDestroyed();
      expect(object.getState()).toBe('DESTROYED');
      expect(() => object.setToAvailable()).toThrowError(TypeError);
    });

    it('should reset idle time if state changes to Available', () => {
      const getTimestamp = jest.fn();
      getTimestamp.mockImplementation(() => 0);
      const object = new PooledObject({}, getTimestamp).setToValidating();
      getTimestamp.mockImplementation(() => 10);
      expect(object.getIdleTime()).toBe(-1);
      expect(object.setToAvailable().getIdleTime()).toBe(0);
      jest.restoreAllMocks();
    });

    it('should not reset idle time if state already Available', () => {
      const getTimestamp = jest.fn();
      getTimestamp.mockImplementation(() => 0);
      const object = new PooledObject({}, getTimestamp).setToAvailable();
      expect(object.getIdleTime()).toBe(0);
      getTimestamp.mockImplementation(() => 10);
      expect(object.setToAvailable().getIdleTime()).toBe(10);
      jest.restoreAllMocks();
    });
  });

  describe('PooledObject.setToBorrowed', () => {
    it('should throw if state is not Available', () => {
      expect(() => new PooledObject({}).setToBorrowed()).toThrowError(TypeError);
      expect(() => newReturnedObject().setToBorrowed()).toThrowError(TypeError);
      expect(() => newValidatingObject().setToBorrowed()).toThrowError(TypeError);
      expect(() => newInvalidObject().setToBorrowed()).toThrowError(TypeError);
      expect(() => newDestroyedObject().setToBorrowed()).toThrowError(TypeError);
    });

    it('should return itself', () => {
      const object = new PooledObject({}).setToAvailable();
      expect(object.setToBorrowed()).toBe(object);
    });

    it('should change state to Borrowed', () => {
      const object = new PooledObject({}).setToAvailable();
      expect(object.setToBorrowed().getState()).toBe('BORROWED');
    });

    it('should create new loan promise', () => {
      const object = new PooledObject({}).setToAvailable();
      expect(object.getLoanPromise()).toBeNull();
      object.setToBorrowed();
      expect(object.getLoanPromise()).toBeInstanceOf(Promise);
    });

    it('should reset idle time to -1 if state changes to Borrowed', () => {
      const dateNowMock = jest.spyOn(global.Date, 'now');
      dateNowMock.mockImplementation(() => 0);
      const object = new PooledObject({}).setToAvailable();
      dateNowMock.mockImplementation(() => 10);
      expect(object.getIdleTime()).toBe(10);
      expect(object.setToBorrowed().getIdleTime()).toBe(-1);
      jest.restoreAllMocks();
    });
  });

  describe('PooledObject.setToReturned', () => {
    it('should throw if state is not Borrowed', () => {
      expect(() => new PooledObject({}).setToReturned()).toThrowError(TypeError);
      expect(() => new PooledObject({}).setToAvailable().setToReturned()).toThrowError(TypeError);
      expect(() => new PooledObject({}).setToValidating().setToReturned()).toThrowError(TypeError);
      expect(() => new PooledObject({}).setToInvalid().setToReturned()).toThrowError(TypeError);
      expect(() => new PooledObject({}).setToDestroyed().setToReturned()).toThrowError(TypeError);
    });

    it('should return itself', () => {
      const object = new PooledObject({}).setToAvailable().setToBorrowed();
      expect(object.setToReturned()).toBe(object);
    });

    it('should change state to Returned', () => {
      const object = new PooledObject({}).setToAvailable().setToBorrowed();
      expect(object.setToReturned().getState()).toBe('RETURNED');
    });

    it('should resolve loan promise', () => {
      const object = new PooledObject({}).setToAvailable().setToBorrowed();
      const loanPromise = object.getLoanPromise();
      object.setToReturned();
      return expect(loanPromise).resolves.toBeUndefined();
    }, 100);
  });

  describe('PooledObject.setToValidating', () => {
    it('should throw if state is Borrowed', () => {
      expect(() => newBorrowedObject().setToValidating()).toThrowError(TypeError);
    });

    it('should throw if state is Invalid', () => {
      expect(() => newInvalidObject().setToValidating()).toThrowError(TypeError);
    });

    it('should throw if state is Destroyed', () => {
      expect(() => newDestroyedObject().setToValidating()).toThrowError(TypeError);
    });

    it('should return itself', () => {
      const object = new PooledObject({});
      expect(object.setToValidating()).toBe(object);
    });

    it('should change state to from Created to Validating', () => {
      expect(new PooledObject({}).setToValidating().getState()).toBe('VALIDATING');
    });

    it('should change state to from Available to Validating', () => {
      const object = newAvailableObject();
      expect(object.setToValidating().getState()).toBe('VALIDATING');
    });

    it('should change state to from Returned to Validating', () => {
      const object = newReturnedObject();
      expect(object.setToValidating().getState()).toBe('VALIDATING');
    });
  });

  describe('PooledObject.setToInvalid', () => {
    it('should throw if state is Destroyed', () => {
      expect(() => newDestroyedObject().setToInvalid()).toThrowError(TypeError);
    });

    it('should return itself', () => {
      const object = new PooledObject({});
      expect(object.setToInvalid()).toBe(object);
    });

    it('should change state to from Created to Invalid', () => {
      expect(new PooledObject({}).setToInvalid().getState()).toBe('INVALID');
    });

    it('should change state to from Available to Invalid', () => {
      const object = newAvailableObject();
      expect(object.setToInvalid().getState()).toBe('INVALID');
    });

    it('should change state to from Returned to Invalid', () => {
      const object = newReturnedObject();
      expect(object.setToInvalid().getState()).toBe('INVALID');
    });

    it('should change state to from Borrowed to Invalid', () => {
      const object = newReturnedObject();
      expect(object.setToInvalid().getState()).toBe('INVALID');
    });

    it('should change state to from Validating to Invalid', () => {
      const object = newValidatingObject();
      expect(object.setToInvalid().getState()).toBe('INVALID');
    });
  });

  describe('PooledObject.setToDestroyed', () => {
    it('should return itself', () => {
      const object = new PooledObject({});
      expect(object.setToInvalid()).toBe(object);
    });

    it('should change state to from Created to Destroyed', () => {
      expect(new PooledObject({}).setToDestroyed().getState()).toBe('DESTROYED');
    });

    it('should change state to from Available to Destroyed', () => {
      const object = newAvailableObject();
      expect(object.setToDestroyed().getState()).toBe('DESTROYED');
    });

    it('should change state to from Returned to Destroyed', () => {
      const object = newReturnedObject();
      expect(object.setToDestroyed().getState()).toBe('DESTROYED');
    });

    it('should change state to from Borrowed to Destroyed', () => {
      const object = newReturnedObject();
      expect(object.setToDestroyed().getState()).toBe('DESTROYED');
    });

    it('should change state to from Validating to Destroyed', () => {
      const object = newValidatingObject();
      expect(object.setToDestroyed().getState()).toBe('DESTROYED');
    });

    it('should change state to from Invalid to Destroyed', () => {
      const object = newInvalidObject();
      expect(object.setToDestroyed().getState()).toBe('DESTROYED');
    });
  });

  describe('PooledObject.getObject', () => {
    it('should return pooled object', () => {
      const object = {};
      expect(new PooledObject(object).getObject()).toBe(object);
    });
  });

  describe('PooledObject.getIdleTime', () => {
    it('should return -1 when not available', () => {
      expect(new PooledObject({}).getIdleTime()).toBe(-1);
      expect(newBorrowedObject().getIdleTime()).toBe(-1);
      expect(newReturnedObject().getIdleTime()).toBe(-1);
      expect(newValidatingObject().getIdleTime()).toBe(-1);
      expect(newInvalidObject().getIdleTime()).toBe(-1);
      expect(newDestroyedObject().getIdleTime()).toBe(-1);
    });

    it('should return number of milliseconds since being made available', () => {
      const getTimestamp = jest.fn();
      getTimestamp.mockImplementation(() => 0);
      const object = new PooledObject({}, getTimestamp).setToAvailable();
      getTimestamp.mockImplementation(() => 10);
      expect(object.getIdleTime()).toBe(10);
      jest.restoreAllMocks();
    });

    it('should return not reset if already available of milliseconds since being made available', () => {
      const getTimestamp = jest.fn();
      getTimestamp.mockImplementation(() => 0);
      const object = new PooledObject({}, getTimestamp).setToAvailable();
      getTimestamp.mockImplementation(() => 10);
      expect(object.getIdleTime()).toBe(10);
      expect(object.setToAvailable().getIdleTime()).toBe(10);
      jest.restoreAllMocks();
    });
  });
});
