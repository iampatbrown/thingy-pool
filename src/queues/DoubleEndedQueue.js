/* eslint-disable no-bitwise */

// Minimum and starting size of the queue
const MIN_CAPACITY = 1;

// The maximum items the queue can hold. see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length
const MAX_CAPACITY = 4294967295; // (2 ** 32) -1

// When queue.length is below this threshold the array backing the queue will not be resized when items are removed
const DECREASE_CAPACITY_THRESH = 8192; // 2 ** 13

/**
 * An array backed double-ended queue
 *
 * ```js
 * const queue = new DoubleEndedQueue()
 * queue.push('B')
 * queue.push('C')
 * queue.unshift('A')
 * queue.toArray() // [ 'A', 'B', 'C' ]
 *```
 *
 * @implements {Iterable} is an iterable
 * @template T
 * @private
 */
class DoubleEndedQueue {
  /**
   *Creates an instance of DoubleEndedQueue.
   */
  constructor() {
    /**
     * Current queue capacity. Must be a power of 2
     * @type {number}
     */
    this._capacity = MIN_CAPACITY;

    /**
     * Capacity mask. Used to determine the correct index of queued items
     * @type {number}
     */
    this._capacityMask = this._capacity - 1;

    /**
     * Array holding the queued items. `Array.length` is manually set to the queue's capacity to preallocate space
     * @type {Array<T|undefined>}
     */
    this._items = new Array(this._capacity);

    /**
     * Index in the array corresponding with the first position in the queue
     * @type {number}
     */
    this._head = 0;

    /**
     * Number of items in the queue
     * @type {number}
     */
    this._length = 0;
  }

  /**
   *
   * Number of items in the queue
   * @type {number}
   */
  get length() {
    return this._length;
  }

  /**
   * Removes the item at the end of the queue and returns it
   * @returns {T|undefined} The removed item or `undefined` if empty
   */
  pop() {
    if (this._length === 0) return undefined;
    this._length -= 1;
    const tail = (this._head + this._length) & this._capacityMask;
    const item = this._items[tail];
    this._items[tail] = undefined;
    if (this._length > DECREASE_CAPACITY_THRESH && this._length * 2 < this._capacity / 2) this._decreaseCapacity();
    return item;
  }

  /**
   * Adds an item to the end of the queue
   * @param {T} item Item to add to the end of the queue
   * @returns {number} New queue `length`
   */
  push(item) {
    if (arguments.length < 1) return this._length;
    if (this._length > this._capacityMask) this._increaseCapacity();
    this._items[(this._head + this._length) & this._capacityMask] = item;
    this._length += 1;
    return this._length;
  }

  /**
   * Removes the item at the start of the queue and returns it
   * @returns {T|undefined} The removed item or `undefined` if empty
   */
  shift() {
    if (this._length === 0) return undefined;
    const item = this._items[this._head];
    this._items[this._head] = undefined;
    this._head = (this._head + 1) & this._capacityMask;
    this._length -= 1;
    if (this._length > DECREASE_CAPACITY_THRESH && this._length * 2 < this._capacity / 2) this._decreaseCapacity();
    return item;
  }

  /**
   * Adds an item to the start of the queue
   * @param {T} item Item to add to the start of the queue
   * @returns {number} New queue `length`
   */
  unshift(item) {
    if (arguments.length < 1) return this._length;
    if (this._length > this._capacityMask) this._increaseCapacity();
    // When current head is 0 this will make the new head the last index in the array
    this._head = (this._head + this._capacityMask) & this._capacityMask;
    this._items[this._head] = item;
    this._length += 1;
    return this._length;
  }

  /**
   * @returns {T|undefined} The first item in the queue or `undefined` if empty
   */
  peek() {
    if (this._length === 0) return undefined;
    return this._items[this._head];
  }

  /**
   * @param {number} index Index to peek
   * @returns {T|undefined} The item at `index` or `undefined` if no item
   */
  peekIndex(index) {
    // Stops indexes outside this range being masked to an incorrect item on the array
    if (index < 0 || index >= this._length) return undefined;
    return this._items[(this._head + index) & this._capacityMask];
  }

  /**
   *
   * Removes the item at given index and shuffles the other items in the array to fill the gap
   * @param {number} index Index of item to be removed
   * @returns {boolean} `true` if item was removed, else `false`
   */
  _removeAtIndex(index) {
    // destructuring to reduce property lookup in loop... need to check the impact of this again...
    const { _head, _capacityMask, _items, _length } = this;
    /* ignore coverage: shouldn't happen because we don't call _removeAtIndex unless an index is found */
    if (index < 0 || index >= _length) return false;
    // shortcut first and last item...
    if (index === 0) {
      this.shift();
      return true;
    }
    if (index === _length - 1) {
      this.pop();
      return true;
    }
    // check which side of removed item has the fewest items that need to be moved in the array
    if (index < _length / 2) {
      // if the removed item is in the first half, copy items from left to right
      for (let i = _head + index; i > _head; i -= 1) {
        // [head][item2][item3][removed] = [head]->[head]->[item2]->[item3]
        _items[i & _capacityMask] = _items[(i - 1) & _capacityMask];
      }
      // make previous head undefined and update new head index = [head][item2][item3]
      _items[_head] = undefined;
      this._head = (_head + 1) & _capacityMask;
    } else {
      // if the removed item is in the second half, copy items from right to left
      const tail = _head + _length - 1;
      for (let i = _head + index; i < tail; i += 1) {
        // [removed][item3][item4][tail] = [item3]<-[item4]<-[tail]<-[tail]
        _items[i & _capacityMask] = _items[(i + 1) & _capacityMask];
      }
      // make previous tail undefined = [item3][item4][tail]
      _items[tail & _capacityMask] = undefined;
    }
    this._length -= 1;
    return true;
  }

  /**
   * Removes the given item from the queue
   * @param {T} item Item to remove from queue
   * @returns {boolean} `true` if item was found and removed, else `false`
   */
  remove(item) {
    if (this._length === 0) return false;
    const { _head, _length, _items, _capacityMask } = this;
    // loop through the queue starting at the head
    for (let index = 0; index < _length; index += 1) {
      if (_items[(_head + index) & _capacityMask] === item) {
        // stop loop and remove item if found
        return this._removeAtIndex(index);
      }
    }
    return false;
  }

  /**
   * Returns an array containing the queued items
   * @returns {Array<T>} Array of queued items
   */
  toArray() {
    if (this._length === 0) return [];
    const { _head, _length, _items, _capacityMask } = this;
    // preallocate space in array for queued items
    const array = new Array(_length);
    // copy queued items to corresponding index in array
    for (let index = 0; index < _length; index += 1) {
      array[index] = _items[(_head + index) & _capacityMask];
    }
    return array;
  }

  /**
   * Increases the capacity and length of the array holding the queued items to the next power of 2
   */
  _increaseCapacity() {
    /* ignore coverage: is there an efficient way to test this? */
    if (this._capacity >= MAX_CAPACITY) throw RangeError('Invalid queue length');
    // ensure that the first item in the queue is at index 0 in the array before changing capacity
    if (this._head !== 0) {
      this._items = this.toArray();
      this._head = 0;
    }
    this._capacity = Math.min(this._capacity * 2, MAX_CAPACITY);
    this._capacityMask = this._capacity - 1;
    this._items.length = this._capacity;
  }

  /**
   * Decrease the capacity and length of the array holding the queued items to the previous power of 2
   */
  _decreaseCapacity() {
    // ensure that the first item in the queue is at index 0 in the array before changing capacity
    if (this._head !== 0) {
      this._items = this.toArray();
      this._head = 0;
    }
    this._capacity = Math.max(this._capacity / 2, MIN_CAPACITY);
    this._capacityMask = this._capacity - 1;
    this._items.length = this._capacity;
  }

  /**
   *
   * Default iterator
   * @returns {Iterator<T>}
   */
  [Symbol.iterator]() {
    // not sure the best way to do this... tried a few different ways... use toArray() if you need an array
    const queue = this;
    let done = false;
    let index = 0;
    return {
      next: () => {
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
}

module.exports = DoubleEndedQueue;
