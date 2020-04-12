const Interface = require('./Interface');

/**
 * This required by the pool to make objects
 *
 * @example
 * const Thingy = require('./Thingy')
 *
 * const factory = {
 *  create: async () => {
 *    const thingy = new Thingy()
 *    await thingy.connect()
 *    return thingy
 *  },
 *  destroy: (thingy) => {
 *    await thingy.disconnect()
 *    return true
 *  }
 * }
 *
 *
 * @interface Factory
 * @template T
 */

/**
 * @method Factory#create
 * @returns {Promise<T>|T}
 */

/**
 * @method Factory#destroy
 * @param {T} thingy
 * @returns {Promise<boolean>|boolean}
 */

/**
 * @method Factory#validate
 * @param {T} thingy
 * @returns {Promise<boolean>|boolean}
 */

const FactoryTypes = {
  create: 'function',
  destroy: 'function',
  validate: 'function|undefined',
};

module.exports = new Interface('factory', FactoryTypes);
