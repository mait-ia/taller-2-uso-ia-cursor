const express = require('express');
const { MemoryStore } = require('./repositories/memoryStore');
const { VaultController } = require('./controllers/vaultController');
const { buildVaultRouter } = require('./routes/vaultRoutes');

function createApp() {
  const app = express();
  app.use(express.json());

  const store = new MemoryStore();
  const controller = new VaultController(store);
  app.use('/', buildVaultRouter(controller));

  // Manejo simple de 404
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  return app;
}

module.exports = { createApp };
