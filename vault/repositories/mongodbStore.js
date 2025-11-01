const { MongoClient } = require('mongodb');

/**
 * Store para MongoDB que implementa la misma interfaz que MemoryStore
 * Almacena pares (token/PII) en la colección "pairs"
 */
class MongoDBStore {
  constructor(uri, dbName, collectionName) {
    this.uri = uri;
    this.dbName = dbName;
    this.collectionName = collectionName;
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  /**
   * Conecta a MongoDB y obtiene referencia a la colección
   * Lazy connection: se conecta solo cuando es necesario
   */
  async connect() {
    if (this.client && this.client.topology && this.client.topology.isConnected()) {
      return; // Ya está conectado
    }

    try {
      console.log(`Conectando a MongoDB: ${this.dbName}.${this.collectionName}...`);
      // Para mongodb+srv, MongoDB maneja TLS automáticamente, no necesitamos especificar opciones TLS
      // Usar opciones mínimas para evitar conflictos con OpenSSL
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);

      // Crear índices para mejorar rendimiento de búsquedas
      try {
        await this.collection.createIndex({ type: 1, _id: 1 }); // Índice compuesto para búsquedas por tipo
        await this.collection.createIndex({ token: 1 }); // Índice para tokens de anonimización
      } catch (indexError) {
        // Ignorar errores de índice si ya existen
        console.warn('Nota: algunos índices pueden ya existir');
      }
      
      console.log(`Conectado a MongoDB: ${this.dbName}.${this.collectionName}`);
    } catch (error) {
      console.error('Error al conectar a MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Desconecta de MongoDB
   */
  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.collection = null;
      console.log('Desconectado de MongoDB');
    }
  }

  /**
   * Guarda un registro de tokenización
   * @param {string} id - UUID del token de tokenización
   * @param {Object} payload - Datos cifrados { enc, keyVer }
   */
  async save(id, payload) {
    await this.ensureConnection();
    
    await this.collection.updateOne(
      { _id: id, type: 'tokenization' },
      {
        $set: {
          _id: id,
          type: 'tokenization',
          enc: payload.enc,
          keyVer: payload.keyVer,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Obtiene un registro de tokenización por ID
   * @param {string} id - UUID del token
   * @returns {Object|null} Registro con { enc, keyVer } o null si no existe
   */
  async get(id) {
    await this.ensureConnection();
    
    const doc = await this.collection.findOne({ _id: id, type: 'tokenization' });
    
    if (!doc) return null;
    
    return {
      enc: doc.enc,
      keyVer: doc.keyVer,
    };
  }

  /**
   * Guarda un token de anonimización (NAME_xxx, EMAIL_xxx, PHONE_xxx) con su PII original
   * @param {string} token - Token de anonimización (ej: "NAME_elbe92e2b3a5")
   * @param {string} pii - PII original
   */
  async saveAnonymizationToken(token, pii) {
    await this.ensureConnection();
    
    await this.collection.updateOne(
      { _id: token, type: 'anonymization' },
      {
        $set: {
          _id: token,
          type: 'anonymization',
          token: token,
          pii: pii,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  }

  /**
   * Busca el PII original por su token de anonimización
   * @param {string} token - Token de anonimización (ej: "NAME_elbe92e2b3a5")
   * @returns {string|null} PII original o null si no existe
   */
  async getByAnonymizationToken(token) {
    await this.ensureConnection();
    
    const doc = await this.collection.findOne({ _id: token, type: 'anonymization' });
    
    if (!doc) return null;
    
    return doc.pii;
  }

  /**
   * Asegura que hay una conexión activa a MongoDB
   */
  async ensureConnection() {
    if (!this.client || !this.client.topology || !this.client.topology.isConnected()) {
      await this.connect();
    }
  }
}

module.exports = { MongoDBStore };

