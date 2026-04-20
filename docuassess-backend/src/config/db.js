const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connect = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    logger.error('[db] MONGODB_URI is not set in environment variables');
    throw new Error('MONGODB_URI is required');
  }

  mongoose.connection.on('connected', () =>
    logger.info('[db] MongoDB connection established')
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('[db] MongoDB connection lost')
  );
  mongoose.connection.on('error', (err) =>
    logger.error(`[db] MongoDB connection error: ${err.message}`)
  );

  await mongoose.connect(uri, {
    // Recommended production settings
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
};

const disconnect = async () => {
  await mongoose.disconnect();
  logger.info('[db] MongoDB disconnected gracefully');
};

module.exports = { connect, disconnect };