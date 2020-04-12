/* eslint-disable no-bitwise */
const MIN_CAPACITY = 1;
const MAX_CAPACITY = 4294967295; // (2 ** 32) -1
const DECREASE_CAPACITY_THRESH = 8192; // 2 ** 13

/**
 * @implements {Iterable} is an iterable
 * @private
 */
class Queue {
  /**
   *Creates an instance of Queue.
   */
  constructor() {
    this._capacity = MIN_CAPACITY;
    this._capacityMask = this._capacity - 1;
    this._items = new Array(this._capacity);
    this._head = 0;
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
   * Removes the item at the end of the queue
   * @returns The removed element or undefined if empty
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

  // Pretty sure I'm using undefined here instead of arguments.length for performance... can't remember
  // have a feeling it was to avoid checking queue length on every iteration
  /**
   * Adds an item to the end of the queue
   * @returns {number}
   */
  push(item) {
    if (item === undefined) return this._length;
    if (this._length > this._capacityMask) this._increaseCapacity();
    this._items[(this._head + this._length) & this._capacityMask] = item;
    this._length += 1;
    return this._length;
  }

  /**
   * Removes the item at the start of the queue
   * @returns The removed element or undefined if empty
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
   * @returns {number}
   */
  unshift(item) {
    if (item === undefined) return this._length;
    if (this._length > this._capacityMask) this._increaseCapacity();
    this._head = (this._head + this._capacityMask) & this._capacityMask;
    this._items[this._head] = item;
    this._length += 1;
    return this._length;
  }

  peek() {
    if (this._length === 0) return undefined;
    return this._items[this._head];
  }

  /**
   * @param {number} index
   * @returns The item at given index or undefined if no item at index
   */
  peekIndex(index) {
    if (index < 0 || index >= this._length) return undefined;
    return this._items[(this._head + index) & this._capacityMask];
  }

  _removeIndex(index) {
    if (index === 0) return !!this.shift();
    if (index === this._length - 1) return !!this.pop();
    const { _head, _capacityMask, _items, _length } = this;
    if (index < _length / 2) {
      for (let i = _head + index; i > _head; i -= 1) {
        _items[i & _capacityMask] = _items[(i - 1) & _capacityMask];
      }
      _items[_head] = undefined;
      this._head = (_head + 1) & _capacityMask;
    } else {
      const tail = _head + _length - 1;
      for (let i = _head + index; i < tail; i += 1) {
        _items[i & _capacityMask] = _items[(i + 1) & _capacityMask];
      }
      _items[tail & _capacityMask] = undefined;
    }
    this._length -= 1;
    return true;
  }

  /**
   * Removes the given item from the queue
   * @param item Item to remove from queue
   * @returns {boolean} true if given item was found and removed, else false
   */
  remove(item) {
    if (this._length === 0) return false;
    const { _head, _length, _items, _capacityMask } = this;
    for (let index = 0; index < _length; index += 1) {
      if (_items[(_head + index) & _capacityMask] === item) {
        this._removeIndex(index);
        return true;
      }
    }
    return false;
  }

  _increaseCapacity() {
    /* ignore coverage: is there an efficient way to test this? */
    if (this._capacity >= MAX_CAPACITY) throw RangeError('Invalid queue length');
    this._alignHeadToZero();
    this._capacity = Math.min(this._capacity * 2, MAX_CAPACITY);
    this._capacityMask = this._capacity - 1;
    this._items.length = this._capacity;
  }

  _decreaseCapacity() {
    this._alignHeadToZero();
    this._capacity = Math.max(this._capacity / 2, MIN_CAPACITY);
    this._capacityMask = this._capacity - 1;
    this._items.length = this._capacity;
  }

  _alignHeadToZero() {
    if (this._head === 0) return;
    this._items = this.toArray();
    this._head = 0;
  }

  toArray() {
    const { _head, _length, _items, _capacity } = this;
    const headLength = _capacity - _head;
    const tailLength = _length - headLength;
    const array = new Array(_length);
    if (headLength >= _length) {
      for (let i = 0; i < _length; i += 1) {
        array[i] = _items[_head + i];
      }
      return array;
    }
    for (let i = 0; i < headLength; i += 1) {
      array[i] = _items[_head + i];
    }
    for (let i = 0; i < tailLength; i += 1) {
      array[headLength + i] = _items[i];
    }
    return array;
  }

  /**
   *
   * @method Queue#@@iterator
   * @returns {Iterator}
   */
  [Symbol.iterator]() {
    return this.toArray()[Symbol.iterator]();
  }
}

module.exports = Queue;
