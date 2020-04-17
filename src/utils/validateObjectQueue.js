const checkTypes = require('./checkTypes');

/**
 * @interface ObjectQueue
 * @borrows DoubleEndedQueue#length as #length
 * @borrows DoubleEndedQueue#peek as #peek
 * @borrows DoubleEndedQueue#pop as #pop
 * @borrows DoubleEndedQueue#push as #push
 * @borrows DoubleEndedQueue#shift as #shift
 */

const ObjectQueueTypes = {
  length: 'number',
  peek: 'function',
  pop: 'function',
  push: 'function',
  shift: 'function',
};

/**
 *
 * Ensures objectQueue can be used by the pool
 * @param {*} objectQueue The objectQueue to validate
 * @memberof Utils
 */
function validateObjectQueue(objectQueue) {
  checkTypes(ObjectQueueTypes, objectQueue, 'objectQueue');
}

module.exports = validateObjectQueue;
