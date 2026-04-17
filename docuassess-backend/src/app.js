require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const appConfig = require('./config/app.config');
const router = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Security & parsing middleware
app.use(helmet());
app.use(cors({ origin: appConfig.corsOrigin, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev', { stream: { write: (msg) => logger.debug(msg.trim()) } }));

// API routes
app.use('/api/v1', router);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});

// Global error handler (must be last)
app.use(errorHandler);

module.exports = app;