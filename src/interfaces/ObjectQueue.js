const Interface = require('./Interface');
/**
 * @interface ObjectQueue
 * @borrows Queue#length as #length
 * @borrows Queue#peekIndex as #peek
 * @borrows Queue#pop as #pop
 * @borrows Queue#push as #push
 * @borrows Queue#shift as #shift
 * @implements {Iterator}
 */

const ObjectQueueTypes = {
  length: 'number',
  peek: 'function',
  pop: 'function',
  push: 'function',
  shift: 'function',
  [Symbol.iterator]: 'function',
};

module.exports = new Interface('objectQueue', ObjectQueueTypes);
