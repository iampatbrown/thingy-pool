const toSafePromise = require('../../src/utils/toSafePromise');

describe('toSafePromise', () => {
  it('should return the promised result', () => {
    const promisedData = { status: 'OK' };
    const promise = new Promise(resolve => resolve(promisedData));
    const safePromise = toSafePromise(promise);
    return expect(safePromise).resolves.toEqual({ result: promisedData });
  });

  it('should still return data if it is not a promise', () => {
    const promisedData = { status: 'OK' };
    const safePromise = toSafePromise(promisedData);
    return expect(safePromise).resolves.toEqual({ result: promisedData });
  });

  it('should return the promise rejection error', () => {
    const expectedError = new Error('EXPECTED ERROR');
    const promise = new Promise((_, reject) => reject(expectedError));
    const safePromise = toSafePromise(promise);
    return expect(safePromise).resolves.toEqual({ error: expectedError });
  });
});
