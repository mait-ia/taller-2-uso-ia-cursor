class MemoryStore {
  constructor() {
    this.map = new Map();
  }

  async save(id, payload) {
    this.map.set(id, payload);
  }

  async get(id) {
    return this.map.get(id) || null;
  }
}

module.exports = { MemoryStore };
