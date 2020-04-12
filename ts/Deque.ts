const MIN_CAPACITY = 1;
const MAX_CAPACITY = 4294967295; // (2 ** 32) -1
const DECREASE_CAPACITY_THRESH = 8192; // 2 ** 13

/**
 *
 *
 * @class Deque
 * @implements {Iterable<T>}
 * @template T
 */
class Deque<T> implements Iterable<T> {
  /** Current capacity of the queue */
  private _capacity: number = MIN_CAPACITY;
  private _capacityMask: number = MIN_CAPACITY - 1;
  private _items: Array<T | undefined> = new Array(MIN_CAPACITY);
  private _head: number = 0;
  private _length: number = 0;

  get length(): number {
    return this._length;
  }

  /**
   *
   * Removes the last item in the queue and returns it. Returns undefined if empty.
   * @returns {T | undefined}
   */
  pop(): T | undefined {
    if (this._length === 0) return undefined;
    this._length -= 1;
    const tail = (this._head + this._length) & this._capacityMask;
    const item = this._items[tail];
    this._items[tail] = undefined;
    if (this._length > DECREASE_CAPACITY_THRESH && this._length * 2 < this._capacity / 2) this._decreaseCapacity();
    return item;
  }

  push(item: T): number {
    if (item === undefined) return this._length;
    if (this._length > this._capacityMask) this._increaseCapacity();
    this._items[(this._head + this._length) & this._capacityMask] = item;
    this._length += 1;
    return this._length;
  }

  shift(): T | undefined {
    if (this._length === 0) return undefined;
    const item = this._items[this._head];
    this._items[this._head] = undefined;
    this._head = (this._head + 1) & this._capacityMask;
    this._length -= 1;
    if (this._length > DECREASE_CAPACITY_THRESH && this._length * 2 < this._capacity / 2) this._decreaseCapacity();
    return item;
  }

  unshift(item: T): number {
    if (item === undefined) return this._length;
    if (this._length > this._capacityMask) this._increaseCapacity();
    this._head = (this._head + this._capacityMask) & this._capacityMask;
    this._items[this._head] = item;
    this._length += 1;
    return this._length;
  }

  peek(): T | undefined {
    if (this._length === 0) return undefined;
    return this._items[this._head];
  }

  peekIndex(index: number): T | undefined {
    if (index < 0 || index >= this._length) return undefined;
    return this._items[(this._head + index) & this._capacityMask];
  }

  private _removeIndex(index: number) {
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

  remove(item: T): boolean {
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

  private _increaseCapacity(): void {
    /* ignore coverage: is there an efficient way to test this? */
    if (this._capacity >= MAX_CAPACITY) throw RangeError('Invalid queue length');
    this._alignHeadToZero();
    this._capacity = Math.min(this._capacity * 2, MAX_CAPACITY);
    this._capacityMask = this._capacity - 1;
    this._items.length = this._capacity;
  }

  _decreaseCapacity(): void {
    this._alignHeadToZero();
    this._capacity = Math.max(this._capacity / 2, MIN_CAPACITY);
    this._capacityMask = this._capacity - 1;
    this._items.length = this._capacity;
  }

  _alignHeadToZero(): void {
    if (this._head === 0) return;
    this._items = [...this];
    this._head = 0;
  }

  [Symbol.iterator](): Iterator<T> {
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

export default Deque;
