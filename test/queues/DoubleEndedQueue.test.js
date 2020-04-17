const { DoubleEndedQueue } = require('../../src/queues');

const LARGE_QUEUE_SIZE = 33000;
const NUM_OF_ITEMS = 40;

function setupEmptyQueue() {
  const queue = new DoubleEndedQueue();
  const array = [];
  const items = [...Array(NUM_OF_ITEMS)].map((_, index) => index);
  return { queue, array, items };
}

function setupQueueWithItems() {
  const { queue, array, items } = setupEmptyQueue();
  items.forEach(item => queue.push(item) && array.push(item));
  return { queue, array, items };
}

function setupLargeQueue() {
  const items = [...Array(LARGE_QUEUE_SIZE)].map((_, index) => index);
  const { queue, array } = setupEmptyQueue();
  items.forEach(item => queue.push(item) && array.push(item));
  return { queue, array, items };
}

describe('DoubleEndedQueue', () => {
  describe('DoubleEndedQueue.push', () => {
    it('should return current length if given no arguments', () => {
      const { queue, items } = setupEmptyQueue();
      expect(queue.push()).toBe(0);
      items.forEach((item, index) => {
        expect(queue.length).toBe(index);
        expect(queue.push()).toBe(index);
        queue.push(item);
      });
      expect(queue.push()).toEqual(items.length);
    });

    it('should add values to end of queue like an array', () => {
      const { queue, array, items } = setupEmptyQueue();
      items.forEach(item => {
        expect(queue.push(item)).toBe(array.push(item));
        expect([...queue]).toEqual(array);
      });
      expect(queue.toArray()).toEqual(items);
    });

    it('should work after queue has been emptied', () => {
      const { queue, array, items } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS + 10; i += 1) {
        queue.pop();
        array.pop();
      }
      items.forEach(item => {
        expect(queue.push(item)).toBe(array.push(item));
        expect([...queue]).toEqual(array);
      });
      expect([...queue]).toEqual(items);
    });
  });

  describe('DoubleEndedQueue.pop', () => {
    it('should remove values to end of queue like an array', () => {
      const { queue, array } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS + 10; i += 1) {
        expect(queue.pop()).toEqual(array.pop());
        expect([...queue]).toEqual(array);
      }
      expect(queue.toArray()).toEqual([]);
    });
  });

  describe('DoubleEndedQueue.unshift', () => {
    it('should return current length if given no arguments', () => {
      const { queue, items } = setupEmptyQueue();
      expect(queue.unshift()).toBe(0);
      items.forEach((item, index) => {
        expect(queue.length).toBe(index);
        expect(queue.unshift()).toBe(index);
        queue.unshift(item);
      });
      expect(queue.unshift()).toEqual(items.length);
    });

    it('should add values to end of queue like an array', () => {
      const { queue, array, items } = setupEmptyQueue();
      items.forEach(item => {
        expect(queue.unshift(item)).toBe(array.unshift(item));
        expect([...queue]).toEqual(array);
      });
      expect([...queue]).toEqual(items.reverse());
    });

    it('should work after queue has been emptied', () => {
      const { queue, array, items } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS + 10; i += 1) {
        queue.pop();
        array.pop();
      }
      items.forEach(item => {
        expect(queue.unshift(item)).toBe(array.unshift(item));
        expect([...queue]).toEqual(array);
      });
      expect([...queue]).toEqual(items.reverse());
    });
  });

  describe('DoubleEndedQueue.shift', () => {
    it('should add values to end of queue like an array', () => {
      const { queue, array } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS + 10; i += 1) {
        expect(queue.shift()).toEqual(array.shift());
        expect([...queue]).toEqual(array);
      }
      expect([...queue]).toEqual([]);
    });
  });

  describe('DoubleEndedQueue.remove', () => {
    it('should remove items from queue', () => {
      const { queue, array, items } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS / 3; i += 1) {
        items.push(items.shift());
      }
      items.forEach(item => {
        expect(queue.remove(item)).toBe(true);
        const index = array.indexOf(item);
        expect(array.splice(index, 1)).toEqual([item]);
        expect([...queue]).toEqual(array);
      });
      expect([...queue]).toEqual([]);
    });

    it('should return false if did not remove item', () => {
      const { queue, items } = setupQueueWithItems();
      items.forEach(item => {
        expect(queue.remove(item.toString())).toBe(false);
      });
      expect([...queue]).toEqual(items);
    });

    it('should return false if queue is empty', () => {
      const { queue, items } = setupEmptyQueue();
      items.forEach(item => {
        expect(queue.remove(item)).toBe(false);
      });
      expect([...queue]).toEqual([]);
    });
  });

  describe('DoubleEndedQueue.peekIndex', () => {
    it('should work like array[index]', () => {
      const { queue, array } = setupQueueWithItems();
      for (let i = -10; i < NUM_OF_ITEMS + 10; i += 1) {
        expect(queue.peekIndex(i)).toEqual(array[i]);
      }
    });
  });

  describe('DoubleEndedQueue.peek', () => {
    it('should return undefined when empty', () => {
      const { queue } = setupEmptyQueue();
      expect(queue.peek()).toBeUndefined();
    });

    it('should return first item in queue', () => {
      const { queue } = setupEmptyQueue();
      queue.push('FIRST');
      expect(queue.peek()).toBe('FIRST');
      queue.push('SECOND');
      expect(queue.peek()).toBe('FIRST');
    });
  });

  describe('DoubleEndedQueue with lots of items', () => {
    it('should push to large queue', () => {
      const { queue, array } = setupLargeQueue();
      for (let i = 0; i < 10; i += 1) {
        expect(queue.push(i)).toBe(array.push(i));
      }
      expect([...queue]).toEqual(array);
    });

    it('should pop from large queue', () => {
      const { queue, array } = setupLargeQueue();
      for (let i = 0; i < 10; i += 1) {
        expect(queue.pop()).toBe(array.pop());
      }
      expect([...queue]).toEqual(array);
      for (let i = 0; i < LARGE_QUEUE_SIZE; i += 1) {
        queue.pop();
      }
      expect([...queue]).toEqual([]);
    });

    it('should unshift to large queue', () => {
      const { queue, array } = setupLargeQueue();
      for (let i = 0; i < 10; i += 1) {
        expect(queue.unshift(i)).toBe(array.unshift(i));
      }
      expect([...queue]).toEqual(array);
    });

    it('should shift from large queue', () => {
      const { queue, array } = setupLargeQueue();
      for (let i = 0; i < 10; i += 1) {
        expect(queue.shift()).toBe(array.shift());
      }
      expect([...queue]).toEqual(array);
      for (let i = 0; i < LARGE_QUEUE_SIZE; i += 1) {
        queue.shift();
      }
      expect([...queue]).toEqual([]);
    });
  });

  describe('DoubleEndedQueue[Symbol.iterator]', () => {
    it('should return independent iterator', () => {
      const { queue } = setupQueueWithItems();
      const iterator1 = queue[Symbol.iterator]();
      const iterator2 = queue[Symbol.iterator]();
      expect(iterator1).not.toBe(iterator2);
      expect(iterator1.next().value).toBe(iterator2.next().value);
      expect(iterator1.next().value).toBe(iterator2.next().value);
    });

    it('should return { done: true } after iterating entire queue', () => {
      const { queue, items } = setupQueueWithItems();
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      expect(iterator.next().done).toBe(true);
      expect(iterator.next().done).toBe(true);
    });

    it('should include items pushed during iteration', () => {
      const { queue, items } = setupQueueWithItems();
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      queue.push('extra item');
      expect(iterator.next().value).toBe('extra item');
      expect(iterator.next().done).toBe(true);
    });

    it('should include items unshifted during iteration', () => {
      const { queue, items } = setupQueueWithItems();
      const iterator = queue[Symbol.iterator]();
      items.forEach(item => expect(iterator.next().value).toBe(item));
      const lastItem = items[items.length - 1];
      queue.unshift('extra item');
      expect(iterator.next().value).toBe(lastItem);
      expect(iterator.next().done).toBe(true);
    });
  });
});
