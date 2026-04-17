require('dotenv').config();

const app = require('./src/app');
const appConfig = require('./src/config/app.config');
const logger = require('./src/utils/logger');

const server = app.listen(appConfig.port, () => {
  logger.info(`Server started on port ${appConfig.port} [${appConfig.nodeEnv}]`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.warn('SIGTERM received — shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});