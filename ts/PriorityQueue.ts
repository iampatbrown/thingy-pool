import Deque from './Deque';

interface Queue<T> {
  length: number;
  push(item: T): number;
  shift(): T | undefined;
  remove(item: T): boolean;
  peekIndex(index: number): T | undefined;
}

type QueueKey = keyof Queue<any>;

interface QueueClass<T> {
  new (): Queue<T>;
}

interface IndexMap {
  queueIndex: number;
  subIndex: number;
}

const QueueTypes: { [key in QueueKey]: string } = {
  length: 'number',
  push: 'function',
  shift: 'function',
  remove: 'function',
  peekIndex: 'function',
};

class PriorityQueue<T> implements Iterable<T> {
  private _QueueClass: QueueClass<T>;
  private _queues: { [key: number]: Queue<T> } = {};
  private _priorities: number[] = [];
  private _sortedQueues: Queue<T>[] = [];
  private _indexMap: { [key: number]: IndexMap } = {};
  private _length: number = 0;

  constructor(QueueClass: QueueClass<T> = Deque) {
    const queue = new QueueClass();
    Object.entries(QueueTypes).forEach(([key, expected]) => {
      const type = typeof queue[key as QueueKey];
      if (type !== expected) throw new TypeError(`queue.${key} must be a ${expected}`);
    });
    this._QueueClass = QueueClass;
  }

  get length(): number {
    return this._length;
  }

  enqueue(item: T, priority: number = 0): number {
    const queue = this._getQueue(priority | 0);
    queue.push(item);
    this._length += 1;
    this._indexMap = {};
    return this._length;
  }

  dequeue(): T | undefined {
    for (let i = 0; i < this._sortedQueues.length; i += 1) {
      const queue = this._sortedQueues[i];
      if (queue.length > 0) {
        this._length -= 1;
        this._indexMap = {};
        return queue.shift();
      }
    }
    return undefined;
  }

  peekIndex(index: number): T | undefined {
    if (!this._indexMap[0]) this._buildIndexMap();
    const mapped = this._indexMap[index];
    if (!mapped) return undefined;
    return this._sortedQueues[mapped.queueIndex].peekIndex(mapped.subIndex);
  }

  remove(item: T): boolean {
    for (let i = 0; i < this._sortedQueues.length; i += 1) {
      const queue = this._sortedQueues[i];
      const didRemove = queue.remove(item);
      if (didRemove) {
        this._length -= 1;
        this._indexMap = {};
        return true;
      }
    }
    return false;
  }

  _buildIndexMap(): void {
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

  _getQueue(priority: number): Queue<T> {
    return this._queues[priority] || this._newQueue(priority);
  }

  _newQueue(priority: number): Queue<T> {
    const queue = new this._QueueClass();
    this._queues[priority] = queue;
    this._priorities.push(priority);
    this._priorities.sort((a, b) => b - a);
    this._sortedQueues = this._priorities.map(sortedPriority => this._queues[sortedPriority]);
    return queue;
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

export default PriorityQueue;
