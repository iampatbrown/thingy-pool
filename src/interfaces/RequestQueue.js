const Interface = require('./Interface');
/**
 * @interface RequestQueue
 * @borrows PriorityQueue#length as #length
 * @borrows PriorityQueue#enqueue as #enqueue
 * @borrows PriorityQueue#dequeue as #dequeue
 * @borrows PriorityQueue#remove as #remove
 * @implements {Iterator}
 */
const RequestQueueTypes = {
  length: 'number',
  enqueue: 'function',
  dequeue: 'function',
  remove: 'function',
  [Symbol.iterator]: 'function',
};

module.exports = new Interface('requestQueue', RequestQueueTypes);
