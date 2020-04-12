class SimpleQueue extends Array {
  enqueue(item) {
    return this.push(item);
  }

  dequeue() {
    return this.shift();
  }

  peekIndex(index) {
    return this[index];
  }

  remove(item) {
    const index = this.indexOf(item);
    /* ignore coverage: shouldn't happen */
    if (index === -1) return false;
    this.splice(index, 1);
    return true;
  }
}

module.exports = SimpleQueue;
