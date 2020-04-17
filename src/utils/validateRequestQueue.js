const checkTypes = require('./checkTypes');

/**
 *
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

/**
 *
 * Ensures requestQueue can be used by the pool
 * @param {*} requestQueue The requestQueue to validate
 * @memberof Utils
 */
function validateRequestQueue(requestQueue) {
  checkTypes(RequestQueueTypes, requestQueue, 'requestQueue');
}

module.exports = validateRequestQueue;
