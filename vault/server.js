const { config } = require('./config/env');
const { createApp } = require('./app');

const app = createApp();

app.listen(config.port, () => {
  console.log(`Vault escuchando en :${config.port}`);
});
