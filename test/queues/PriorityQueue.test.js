const { PriorityQueue } = require('../../src/queues');
const LowerCaseQueue = require('../helpers/LowerCaseQueue');

describe('PriorityQueue', () => {
  describe('PriorityQueue.constructor', () => {
    it('should accept custom QueueClass for priority queue', () => {
      const queue = new PriorityQueue(LowerCaseQueue);
      ['A', 'B', 'C', 'D', 'E'].forEach(item => queue.enqueue(item));
      expect([...queue]).toEqual(['a', 'b', 'c', 'd', 'e']);
      expect(queue.remove('c')).toBe(true);
      expect(queue.remove('c')).toBe(false);
      expect([...queue]).toEqual(['a', 'b', 'd', 'e']);
      ['a', 'b', 'd', 'e'].forEach(item => expect(queue.dequeue()).toBe(item));
      expect([...queue]).toEqual([]);
    });

    it('should throw when invalid QueueClass is provided', () => {
      expect(() => new PriorityQueue(Array)).toThrowError(TypeError);
    });
  });

  describe('PriorityQueue.enqueue', () => {
    it('should return new queue length', () => {
      const queue = new PriorityQueue();
      ['A', 'B', 'C', 'D', 'E'].forEach((item, index) => {
        expect(queue.enqueue(item)).toBe(index + 1);
        expect(queue.length).toEqual(index + 1);
      });
    });

    it('should enqueue item with default priority', () => {
      const queue = new PriorityQueue();
      ['A', 'B', 'C', 'D', 'E'].forEach(item => queue.enqueue(item));
      expect([...queue]).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(queue.toArray()).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('should enqueue items according to priority', () => {
      const queue = new PriorityQueue();
      [
        ['E', 0],
        ['B', 3],
        ['A', 4],
        ['D', 1],
        ['C', 2],
      ].forEach(([item, priority]) => queue.enqueue(item, priority));
      expect([...queue]).toEqual(['A', 'B', 'C', 'D', 'E']);
    });

    it('should enqueue items according to priority and order added', () => {
      const queue = new PriorityQueue();
      [
        ['E', 0],
        ['A', 2],
        ['C', 1],
        ['B', 2],
        ['D', 1],
      ].forEach(([item, priority]) => queue.enqueue(item, priority));
      expect([...queue]).toEqual(['A', 'B', 'C', 'D', 'E']);
      expect(queue.length).toEqual(5);
    });

    it('should work with lots of items', () => {
      const queue = new PriorityQueue();
      const items = [...Array(300)].map((_, index) => [index, 9 - (index % 10)]);
      const sortedWithoutPriority = [...items].sort((a, b) => b[1] - a[1]).map(([item]) => item);
      items.forEach(([item, priority]) => queue.enqueue(item, priority));
      expect([...queue]).toEqual(sortedWithoutPriority);
    });
  });

  describe('PriorityQueue.dequeue', () => {
    it('should return undefined when queue is empty', () => {
      const queue = new PriorityQueue();
      expect(queue.dequeue()).toBeUndefined();
    });

    it('should dequeue items according to priority', () => {
      const queue = new PriorityQueue();
      [
        ['E', 0],
        ['B', 3],
        ['A', 4],
        ['D', 1],
        ['C', 2],
      ].forEach(([item, priority]) => queue.enqueue(item, priority));
      ['A', 'B', 'C', 'D', 'E'].forEach(item => expect(queue.dequeue()).toBe(item));
      expect([...queue]).toEqual([]);
      expect(queue.length).toEqual(0);
    });

    it('should work with lots of items', () => {
      const queue = new PriorityQueue();
      const items = [...Array(300)].map((_, index) => [index, 9 - (index % 10)]);
      const sortedWithoutPriority = [...items].sort((a, b) => b[1] - a[1]).map(([item]) => item);
      items.forEach(([item, priority]) => queue.enqueue(item, priority));
      sortedWithoutPriority.forEach(item => expect(queue.dequeue()).toBe(item));
    });
  });

  describe('PriorityQueue.remove', () => {
    it('should return false when queue is empty', () => {
      const queue = new PriorityQueue();
      expect(queue.remove('A')).toBe(false);
    });

    it('should remove first found instance of item', () => {
      const queue = new PriorityQueue();
      ['A', 'B', 'C', 'A'].forEach(item => queue.enqueue(item));
      expect(queue.remove('B')).toBe(true);
      expect([...queue]).toEqual(['A', 'C', 'A']);
      expect(queue.remove('A')).toBe(true);
      expect([...queue]).toEqual(['C', 'A']);
      expect(queue.remove('A')).toBe(true);
      expect([...queue]).toEqual(['C']);
      expect(queue.remove('A')).toBe(false);
      expect([...queue]).toEqual(['C']);
      expect(queue.remove('C')).toBe(true);
      expect([...queue]).toEqual([]);
    });
  });

  describe('PriorityQueue[Symbol.iterator]', () => {
    it('should return independent iterator', () => {
      const queue = new PriorityQueue();
      ['A', 'B', 'C', 'D', 'E'].forEach(item => queue.enqueue(item));
      const iterator1 = queue[Symbol.iterator]();
      const iterator2 = queue[Symbol.iterator]();
      expect(iterator1).not.toBe(iterator2);
      expect(iterator1.next().value).toBe(iterator2.next().value);
      expect(iterator1.next().value).toBe(iterator2.next().value);
    });

    it('should return { done: true } after iterating entire queue', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      expect(iterator.next().done).toBe(true);
      expect(iterator.next().done).toBe(true);
    });

    it('should include items enqueued during iteration', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      queue.enqueue('extra item');
      expect(iterator.next().value).toBe('extra item');
      expect(iterator.next().done).toBe(true);
    });

    it('should include items enqueued to front during iteration', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      queue.enqueue('extra item', 10);
      expect(iterator.next().value).toBe('E');
      expect(iterator.next().done).toBe(true);
    });
  });

  describe('PriorityQueue.peekIndex', () => {
    it('should work like array[index]', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      items.forEach((item, index) => expect(queue.peekIndex(index)).toBe(item));
      expect(queue.peekIndex(-1)).toBeUndefined();
      expect(queue.peekIndex(10)).toBeUndefined();
    });
  });

  describe('PriorityQueue[Symbol.iterator]', () => {
    it('should return independent iterator', () => {
      const queue = new PriorityQueue();
      ['A', 'B', 'C', 'D', 'E'].forEach(item => queue.enqueue(item));
      const iterator1 = queue[Symbol.iterator]();
      const iterator2 = queue[Symbol.iterator]();
      expect(iterator1).not.toBe(iterator2);
      expect(iterator1.next().value).toBe(iterator2.next().value);
      expect(iterator1.next().value).toBe(iterator2.next().value);
    });

    it('should return { done: true } after iterating entire queue', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      expect(iterator.next().done).toBe(true);
      expect(iterator.next().done).toBe(true);
    });

    it('should include items enqueued during iteration', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      queue.enqueue('extra item');
      expect(iterator.next().value).toBe('extra item');
      expect(iterator.next().done).toBe(true);
    });

    it('should include items enqueued to front during iteration', () => {
      const queue = new PriorityQueue();
      const items = ['A', 'B', 'C', 'D', 'E'];
      items.forEach(item => queue.enqueue(item));
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      queue.enqueue('extra item', 10);
      expect(iterator.next().value).toBe('E');
      expect(iterator.next().done).toBe(true);
    });
  });
});
