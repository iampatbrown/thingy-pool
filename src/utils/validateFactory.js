const checkTypes = require('./checkTypes');

/**
 * Factory responsible for creating, validating and destroying the objects used by the pool
 *
 * @example
 * const Api = require('some-api');
 *
 * const factory = {
 *   create: async () => {
 *     const api = new Api();
 *     await api.connect();
 *     return api;
 *   },
 *   destroy: async api => {
 *     await api.disconnect();
 *     console.log(`${api} has been disconnected!`);
 *   },
 *  validate: async api => {
 *    const response = await api.ping()
 *    const isValid = (response && response.time < 100)
 *    return isValid
 * }
 *
 * @interface Factory
 * @template {object} T
 */

/**
 * @method Factory#create
 * @returns {Promise<T>} Promise of factory object
 */

/**
 * @method Factory#destroy
 * @param {T} object
 * @returns {Promise<void>}
 */

/**
 * Should return `true` if item is valid, else `false`
 * @method Factory#validate
 * @param {T} object
 * @returns {Promise<boolean>} Promise with validation result
 */

const FactoryTypes = {
  create: 'function',
  destroy: 'function',
};

const FactoryWithValidateTypes = {
  ...FactoryTypes,
  validate: 'function',
};

/**
 *
 * Ensures the factory can be used by the pool
 * @param {*} factory The factory to validate
 * @param {boolean} [shouldValidate=false] Is factory.validate required by the pool?
 * @memberof Utils
 */
function validateFactory(factory, shouldValidate = false) {
  if (shouldValidate) {
    checkTypes(FactoryWithValidateTypes, factory, 'factory');
  } else {
    checkTypes(FactoryTypes, factory, 'factory');
  }
}

module.exports = validateFactory;
