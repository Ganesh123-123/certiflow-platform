import { startCertificateWorker } from './certificate.worker';
import { startWhatsAppWorker } from './whatsapp.worker';
import { startOverdueMonitor } from './overdue.worker';
import { connectDatabase } from '../config/database';
import { logger } from '../utils/logger';

async function main() {
  await connectDatabase();
  startCertificateWorker();
  startWhatsAppWorker();
  startOverdueMonitor();
  logger.info('Workers started');
}

main().catch((err) => {
  logger.error('Worker startup failed:', err);
  process.exit(1);
});
