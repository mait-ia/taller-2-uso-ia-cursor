// Cargar variables de entorno desde .env al inicio
require('dotenv').config();

const { config } = require('./config/env');
const { createApp } = require('./app');

// Crear la app de forma asíncrona ya que puede necesitar conectar a MongoDB
createApp()
  .then((app) => {
    const server = app.listen(config.port, () => {
      console.log(`Vault escuchando en :${config.port}`);
    });

    // Manejar cierre graceful del servidor
    process.on('SIGTERM', async () => {
      console.log('SIGTERM recibido, cerrando servidor...');
      server.close(() => {
        console.log('Servidor HTTP cerrado');
      });
      // Cerrar conexión de MongoDB si existe
      if (app.locals.store && typeof app.locals.store.disconnect === 'function') {
        await app.locals.store.disconnect();
      }
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT recibido, cerrando servidor...');
      server.close(() => {
        console.log('Servidor HTTP cerrado');
      });
      // Cerrar conexión de MongoDB si existe
      if (app.locals.store && typeof app.locals.store.disconnect === 'function') {
        await app.locals.store.disconnect();
      }
      process.exit(0);
    });
  })
  .catch((error) => {
    console.error('Error al inicializar la aplicación:', error);
    process.exit(1);
  });
