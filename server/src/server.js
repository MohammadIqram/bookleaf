import app from './app.js';
import { env } from './config/env.js';
import logger from './utils/logger.js';
import prisma from './config/prisma.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 BookLeaf Support Portal API running in [${env.NODE_ENV}] mode on port ${PORT}`);
  logger.info(`📡 API Version 1 Base URL: http://localhost:${PORT}/api/v1`);
  logger.info(`🩺 Health Check: http://localhost:${PORT}/api/health`);
});

// Graceful Shutdown Handlers
async function handleShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await prisma.$disconnect();
      logger.info('Database connections closed.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during database disconnection:', { error: err.message });
      process.exit(1);
    }
  });

  // Force close after 10 seconds if hanging
  setTimeout(() => {
    logger.error('Graceful shutdown timeout exceeded. Forcing termination.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : reason,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default server;
