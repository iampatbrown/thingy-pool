function flushPromises() {
  return new Promise(resolve => setImmediate(resolve));
}

module.exports = flushPromises;
