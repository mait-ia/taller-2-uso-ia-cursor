class MemoryStore {
  constructor() {
    this.map = new Map(); // Para tokenización: id -> { enc, keyVer }
    this.anonymizationTokens = new Map(); // Para anonimización: token -> pii
  }

  async save(id, payload) {
    this.map.set(id, payload);
  }

  async get(id) {
    return this.map.get(id) || null;
  }

  // Guardar un token de anonimización (NAME_xxx, EMAIL_xxx, PHONE_xxx) con su PII
  async saveAnonymizationToken(token, pii) {
    this.anonymizationTokens.set(token, pii);
  }

  // Buscar el PII original por su token de anonimización
  async getByAnonymizationToken(token) {
    return this.anonymizationTokens.get(token) || null;
  }
}

module.exports = { MemoryStore };
