import 'dotenv/config';
import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import { initSocketServer } from './socket/socket.server';
import { startCertificateWorker } from './workers/certificate.worker';
import { startWhatsAppWorker } from './workers/whatsapp.worker';
import { startOverdueMonitor } from './workers/overdue.worker';
import fs from 'fs';
import path from 'path';

async function main() {
  // Ensure upload directories exist
  const uploadDir = path.resolve(env.UPLOAD_DIR, 'certificates');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Connect to database
  await connectDatabase();

  // Create HTTP server
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  initSocketServer(httpServer);

  // Start background workers
  startCertificateWorker();
  startWhatsAppWorker();
  startOverdueMonitor();

  // Start listening
  httpServer.listen(env.PORT, () => {
    logger.info(`🚀 CertiFlow Backend running on port ${env.PORT}`);
    logger.info(`📊 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Health check: http://localhost:${env.PORT}/health`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully...`);
    httpServer.close(async () => {
      const { disconnectDatabase } = await import('./config/database');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error('Force exiting after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
