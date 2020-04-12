/* eslint-disable no-bitwise */
const Queue = require('./Queue');

const QUEUE_METHODS = ['push', 'shift', 'remove', 'peekIndex'];

/**
 * @typedef {function(new:Queue)} QueueClass
 * @private
 */

/**
 * @implements {Iterable} is an iterable
 * @template item
 * @private
 */
class PriorityQueue {
  /**
   *Creates an instance of PriorityQueue.
   * @param {function(new:Queue)} [QueueClass=Queue] See {@link Queue}
   */
  constructor(QueueClass = Queue) {
    const queue = new QueueClass();
    const isValidQueue =
      QUEUE_METHODS.every(method => typeof queue[method] === 'function') && typeof queue.length === 'number';
    if (!isValidQueue) throw TypeError(`Invalid QueueClass. Must implement .${QUEUE_METHODS.join('(), ')}() & .length`);

    this._QueueClass = QueueClass;
    this._queues = {};
    this._priorities = [];
    this._sortedQueues = [];
    this._indexMap = null;
    this._length = 0;
  }

  /**
   *
   * The length of the queue
   * @readonly
   */
  get length() {
    return this._length;
  }

  /**
   *
   * @param {item} item
   * @param {number} [priority=0]
   * @returns {number}
   */
  enqueue(item, priority = 0) {
    const queue = this._getQueue(priority | 0);
    queue.push(item);
    this._length += 1;
    this._indexMap = null;
    return this._length;
  }

  /**
   *
   *
   * @returns {item | undefined}
   */
  dequeue() {
    for (let i = 0; i < this._sortedQueues.length; i += 1) {
      const queue = this._sortedQueues[i];
      if (queue.length > 0) {
        this._length -= 1;
        this._indexMap = null;
        return queue.shift();
      }
    }
    return undefined;
  }

  /**
   *
   *
   * @param {number} index
   * @returns {item | undefined}
   */
  peekIndex(index) {
    if (!this._indexMap) this._buildIndexMap();
    const mapped = this._indexMap[index];
    if (!mapped) return undefined;
    return this._sortedQueues[mapped.queueIndex].peekIndex(mapped.subIndex);
  }

  /**
   *
   *
   * @param {item} item
   * @returns {boolean}
   */
  remove(item) {
    for (let i = 0; i < this._sortedQueues.length; i += 1) {
      const queue = this._sortedQueues[i];
      const didRemove = queue.remove(item);
      if (didRemove) {
        this._length -= 1;
        this._indexMap = null;
        return true;
      }
    }
    return false;
  }

  _buildIndexMap() {
    this._indexMap = {};
    let index = 0;
    for (let queueIndex = 0; queueIndex < this._sortedQueues.length; queueIndex += 1) {
      const queue = this._sortedQueues[queueIndex];
      const queueLength = queue.length;
      for (let subIndex = 0; subIndex < queueLength; subIndex += 1) {
        this._indexMap[index] = { queueIndex, subIndex };
        index += 1;
      }
    }
  }

  _getQueue(priority) {
    return this._queues[priority] || this._newQueue(priority);
  }

  _newQueue(priority) {
    const queue = new this._QueueClass();
    this._queues[priority] = queue;
    this._priorities.push(priority);
    this._priorities.sort((a, b) => b - a);
    this._sortedQueues = this._priorities.map(sortedPriority => this._queues[sortedPriority]);
    return queue;
  }

  [Symbol.iterator]() {
    const queue = this;
    let done = false;
    let index = 0;
    return {
      next: () => {
        if (done) return { value: undefined, done: true };
        const value = queue.peekIndex(index);
        if (value === undefined) {
          done = true;
          return { value: undefined, done: true };
        }
        index += 1;
        return { value, done: false };
      },
    };
  }
}

module.exports = PriorityQueue;
