/* eslint-disable no-bitwise */
const DoubleEndedQueue = require('./DoubleEndedQueue');

/**
 * @example
 * // Simple Queue class created by extending Array
 * class Queue extends Array {
 *   remove(item) {
 *     const index = this.indexOf(item);
 *     if (index === -1) return false;
 *     this.splice(index, 1);
 *     return true;
 *   }
 *
 *   peekIndex(index) {
 *     return this[index];
 *   }
 * }
 *
 * @typedef {Object} Queue
 * @property {number} length
 * @property {function(T):number} push
 * @property {function():T|undefined} shift
 * @property {function(T):boolean} remove
 * @property {function(number):T|undefined} peekIndex
 * @template T
 * @memberof PriorityQueue
 * @alias Queue
 */

/**
 * @typedef {function(new:Queue<T>)} QueueClass
 * @template T
 * @memberof PriorityQueue
 * @alias QueueClass
 */

/**
 * @example
 * const priorityQueue = new PriorityQueue(Queue);
 *
 * priorityQueue.enqueue('Default'); // Same as priorityQueue.enqueue('Default', 0);
 * priorityQueue.enqueue('High', 2);
 * priorityQueue.enqueue('Medium', 1);
 *
 * priorityQueue.toArray(); // [ 'High', 'Medium', 'Default' ]
 *
 * @implements {Iterable} is an iterable
 * @template T
 * @private
 */
class PriorityQueue {
  /**
   * @param {QueueClass<T>} [QueueClass=DoubleEndedQueue] See {@link Queue}
   */
  constructor(QueueClass = DoubleEndedQueue) {
    // throws if the provided QueueClass is incompatible with the PriorityQueue
    PriorityQueue.validateQueueClass(QueueClass);

    /**
     * Class for creating queues associated with different priorities
     * @type {QueueClass<T>}
     */
    this._QueueClass = QueueClass;

    /**
     * Queues keyed by their priority
     * @type {Object<number,Queue<T>>}
     */
    this._queues = {};

    /**
     * Array of sorted priorities
     * @type {Array<number>}
     */
    this._priorities = [];

    /**
     * Array of queues sorted by priority
     * @type {Array<Queue<T>>}
     */
    this._sortedQueues = [];

    /**
     * Array of queues sorted by priority
     * @type {Array<Array<number>>}
     */
    this._indexMap = [];

    /**
     * Number of items in the queue
     * @type {number}
     */
    this._length = 0;
  }

  /**
   *
   * Number of items in the queue
   * @returns {number}
   */
  get length() {
    return this._length;
  }

  /**
   * Adds an item to the queue with the given priority. If no priority is given a default of `0` is used
   * @param {T} item The item to be added to the queue
   * @param {number} [priority=0] The priority for this item. The higher the number the higher the priority
   * @returns {number} New queue `length`
   */
  enqueue(item, priority = 0) {
    // get or create queue for given priority. Using bitwise OR to convert priority to integer if needed
    const queue = this._queues[priority | 0] || this._getQueue(priority | 0);
    queue.push(item);
    this._length += 1;
    // clear indexMap if needed
    if (this._indexMap.length > 0) this._indexMap = [];
    return this._length;
  }

  /**
   * Removes the item at the start of the queue and returns it
   * @returns {T|undefined} The removed item or `undefined` if empty
   */
  dequeue() {
    if (this._length === 0) return undefined;
    for (let i = 0; i < this._sortedQueues.length; i += 1) {
      const queue = this._sortedQueues[i];
      if (queue.length > 0) {
        this._length -= 1;
        // clear indexMap if needed
        if (this._indexMap.length > 0) this._indexMap = [];
        return queue.shift();
      }
    }
  }

  /**
   * Returns the item at the given index
   * @param {number} index Index to peek
   * @returns The item at `index` or `undefined` if no item
   */
  peekIndex(index) {
    // create an index map if it doesn't exist
    if (this._indexMap.length === 0) this._buildIndexMap();
    const mappedIndex = this._indexMap[index];
    if (!mappedIndex) return undefined;
    const [queueIndex, itemIndex] = mappedIndex;
    return this._sortedQueues[queueIndex].peekIndex(itemIndex);
  }

  /**
   * Removes the given item from the queue
   * @param {T} item Item to remove from queue
   * @returns {boolean} `true` if item was found and removed, else `false`
   */
  remove(item) {
    // call remove on sorted queues until item is successfully removed once
    for (let i = 0; i < this._sortedQueues.length; i += 1) {
      const queue = this._sortedQueues[i];
      const didRemove = queue.remove(item);
      if (didRemove) {
        this._length -= 1;
        // clear indexMap if needed
        if (this._indexMap.length > 0) this._indexMap = [];
        return true;
      }
    }
    // if the given item was not removed false will be returned
    return false;
  }

  /**
   * Returns an array containing the queued items
   * @returns {Array<T>} Array of queued items
   */
  toArray() {
    const { _length } = this;
    // preallocate space in array for queued items
    const array = new Array(_length);
    let index = 0;
    // loop through the queues and copy queued items to corresponding index in array
    for (let queueIndex = 0; queueIndex < this._sortedQueues.length; queueIndex += 1) {
      const queue = this._sortedQueues[queueIndex];
      const queueLength = queue.length;
      for (let itemIndex = 0; itemIndex < queueLength; itemIndex += 1) {
        array[index] = queue.peekIndex(itemIndex);
        index += 1;
      }
    }
    return array;
  }

  /**
   *
   * Creates an array that maps indexes to the correct queue and index for that queue
   */
  _buildIndexMap() {
    // eg. [[0, 0], [0, 1], [0, 2], [1, 0], [2, 0], [2, 1]]
    this._indexMap = [];
    let index = 0;
    for (let queueIndex = 0; queueIndex < this._sortedQueues.length; queueIndex += 1) {
      const queue = this._sortedQueues[queueIndex];
      const queueLength = queue.length;
      for (let itemIndex = 0; itemIndex < queueLength; itemIndex += 1) {
        this._indexMap[index] = [queueIndex, itemIndex];
        index += 1;
      }
    }
  }

  /**
   *
   * Returns queue for the given priority
   * @param {number} priority The priority for the queue
   * @returns {Queue<T>}
   */
  _getQueue(priority) {
    // if queue doesn't exist, create it
    if (!this._queues[priority]) {
      this._queues[priority] = new this._QueueClass();
      // add new priority and ensure priorities are sorted
      this._priorities.push(priority);
      this._priorities.sort((a, b) => b - a);
      // update array of queues sorted by priority
      this._sortedQueues = this._priorities.map(sortedPriority => this._queues[sortedPriority]);
    }
    return this._queues[priority];
  }

  /**
   *
   * Default iterator
   * @returns {Iterator<T>}
   */
  [Symbol.iterator]() {
    const queue = this;
    let done = false;
    let index = 0;
    return {
      next() {
        if (done) return { value: undefined, done: true };
        if (index >= queue.length) {
          done = true;
          return { value: undefined, done: true };
        }
        // not a massive fan of this... don't want to check for undefined though... it think queue.length works better... not sure...
        const value = /** @type {T} */ (queue.peekIndex(index));
        index += 1;
        return { value, done: false };
      },
    };
  }

  /**
   *
   * Checks QueueClass to make sure it is compatible with PriorityQueue. Throws if not valid
   * @static
   * @param {*} QueueClass
   */
  static validateQueueClass(QueueClass) {
    const queue = new QueueClass();
    const methodKeys = ['push', 'shift', 'remove', 'peekIndex'];
    const isValid = methodKeys.every(key => typeof queue[key] === 'function') && typeof queue.length === 'number';
    if (!isValid) throw TypeError(`Invalid QueueClass. Must implement .${methodKeys.join('(), ')}() & .length`);
  }
}

module.exports = PriorityQueue;
