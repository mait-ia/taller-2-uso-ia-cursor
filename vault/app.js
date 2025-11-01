const express = require('express');
const { config } = require('./config/env');
const { MemoryStore } = require('./repositories/memoryStore');
const { MongoDBStore } = require('./repositories/mongodbStore');
const { VaultController } = require('./controllers/vaultController');
const { buildVaultRouter } = require('./routes/vaultRoutes');

/**
 * Crea y configura la aplicación Express
 * Usa MongoDBStore si MONGODB_URI está configurado, sino usa MemoryStore como fallback
 */
async function createApp() {
  const app = express();
  app.use(express.json());

  // Decidir qué store usar: MongoDB si está configurado, sino MemoryStore
  let store;
  if (config.mongodb.uri) {
    console.log('Configurando MongoDBStore...');
    store = new MongoDBStore(
      config.mongodb.uri,
      config.mongodb.dbName,
      config.mongodb.collectionName
    );
    // Intentar conectar en background, no bloquear el inicio del servidor
    store.connect().catch((error) => {
      console.warn('⚠️  No se pudo conectar a MongoDB al inicio:', error.message);
      console.warn('⚠️  Se intentará conectar cuando sea necesario (lazy connection)');
    });
  } else {
    console.log('Configurando MemoryStore (sin MongoDB)...');
    store = new MemoryStore();
  }

  const controller = new VaultController(store);
  app.use('/', buildVaultRouter(controller));

  // Guardar referencia al store para poder cerrarlo al terminar
  app.locals.store = store;

  // Manejo simple de 404
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

module.exports = { createApp };
