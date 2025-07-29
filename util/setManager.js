class SetManager {
  constructor(limit = 1000) {
    this.limit = limit;
    this.set = new Set();
    this.queue = [];
  }

  has(value) {
    return this.set.has(value);
  }

  add(value) {
    if (this.set.has(value)) return;

    this.set.add(value);
    this.queue.push(value);

    if (this.set.size > this.limit) {
      const oldest = this.queue.shift();
      this.set.delete(oldest);
    }
  }

  clear() {
    this.set.clear();
    this.queue = [];
  }
}

module.exports = { SetManager };
