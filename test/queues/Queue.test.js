const { Queue } = require('../../src/queues');

const LARGE_QUEUE_SIZE = 33000;
const NUM_OF_ITEMS = 40;

function setupEmptyQueue() {
  const queue = new Queue();
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

describe('Queue', () => {
  describe('Queue.push', () => {
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

    it('should return current length if passed undefined', () => {
      const { queue, items } = setupEmptyQueue();
      expect(queue.push(undefined)).toBe(0);
      items.forEach((item, index) => {
        expect(queue.push(undefined)).toBe(index);
        queue.push(item);
      });
      expect(queue.push(undefined)).toEqual(items.length);
    });

    it('should add values to end of queue like an array', () => {
      const { queue, array, items } = setupEmptyQueue();
      items.forEach(item => {
        expect(queue.push(item)).toBe(array.push(item));
        expect([...queue]).toEqual(array);
      });
      expect([...queue]).toEqual(items);
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

  describe('Queue.pop', () => {
    it('should remove values to end of queue like an array', () => {
      const { queue, array } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS + 10; i += 1) {
        expect(queue.pop()).toEqual(array.pop());
        expect([...queue]).toEqual(array);
      }
      expect([...queue]).toEqual([]);
    });
  });

  describe('Queue.unshift', () => {
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

    it('should return current length if passed undefined', () => {
      const { queue, items } = setupEmptyQueue();
      expect(queue.unshift(undefined)).toBe(0);
      items.forEach((item, index) => {
        expect(queue.unshift(undefined)).toBe(index);
        queue.unshift(item);
      });
      expect(queue.unshift(undefined)).toEqual(items.length);
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

  describe('Queue.shift', () => {
    it('should add values to end of queue like an array', () => {
      const { queue, array } = setupQueueWithItems();
      for (let i = 0; i < NUM_OF_ITEMS + 10; i += 1) {
        expect(queue.shift()).toEqual(array.shift());
        expect([...queue]).toEqual(array);
      }
      expect([...queue]).toEqual([]);
    });
  });

  describe('Queue.remove', () => {
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

  describe('Queue.peekIndex', () => {
    it('should work like array[index]', () => {
      const { queue, array } = setupQueueWithItems();
      for (let i = -10; i < NUM_OF_ITEMS + 10; i += 1) {
        expect(queue.peekIndex(i)).toEqual(array[i]);
      }
    });
  });

  describe('Queue with lots of items', () => {
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
});
