class LowerCaseQueue extends Array {
  enqueue(item) {
    return this.push(item);
  }

  dequeue() {
    return this.shift();
  }

  push(item) {
    return super.push(item.toLowerCase());
  }

  peekIndex(index) {
    return this[index];
  }

  remove(item) {
    const index = this.indexOf(item.toLowerCase());
    if (index === -1) return false;
    this.splice(index, 1);
    return true;
  }
}

module.exports = LowerCaseQueue;
