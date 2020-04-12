const Pool = require('../../src/Pool');
const TestFactory = require('./TestFactory');

function setupForTests({ factoryTaskIntervalInMs = 2, maxSize = 10, getTimestamp = Date.now, ...otherOptions } = {}) {
  const factory = new TestFactory(factoryTaskIntervalInMs);
  const pool = new Pool(factory, { maxSize, ...otherOptions }, { getTimestamp });
  const factoryCreate = jest.spyOn(factory, 'create');
  const factoryValidate = jest.spyOn(factory, 'validate');
  const factoryDestroy = jest.spyOn(factory, 'destroy');
  const callback = jest.fn();
  return { pool, factory, factoryCreate, factoryValidate, factoryDestroy, callback };
}

module.exports = setupForTests;
