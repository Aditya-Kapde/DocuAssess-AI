require('dotenv').config();

const app       = require('./src/app');
const appConfig = require('./src/config/app.config');
const logger    = require('./src/utils/logger');
const db        = require('./src/config/db');

const start = async () => {
  // Connect to MongoDB first — fail fast if unavailable
  await db.connect();

  const server = app.listen(appConfig.port, () => {
    logger.info(`Server started on port ${appConfig.port} [${appConfig.nodeEnv}]`);
  });

  const shutdown = async (signal) => {
    logger.warn(`${signal} received — shutting down gracefully`);
    server.close(async () => {
      await db.disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Promise Rejection:', reason);
    process.exit(1);
  });
};

start().catch((err) => {
  // Catches DB connection failure at boot
  console.error('Fatal startup error:', err.message);
  process.exit(1);
});