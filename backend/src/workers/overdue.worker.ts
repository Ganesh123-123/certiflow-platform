import cron from 'node-cron';
import { prisma } from '../config/database';
import { BatchStatus } from '../types/enums';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function startOverdueMonitor() {
  const job = cron.schedule('0 * * * *', async () => {
    logger.info('Running overdue batch check...');
    try {
      const thresholdTime = new Date(Date.now() - env.OVERDUE_THRESHOLD_HOURS * 60 * 60 * 1000);

      const overdueBatches = await prisma.batch.findMany({
        where: {
          status: { in: [BatchStatus.DISTRICT_REVIEW, BatchStatus.QUALITY_REVIEW] },
          isOverdue: false,
          submittedAt: { lte: thresholdTime },
        },
      });

      for (const batch of overdueBatches) {
        await prisma.batch.update({ where: { id: batch.id }, data: { isOverdue: true, overdueAt: new Date() } });

        const stateOfficers = await prisma.user.findMany({ where: { role: 'STATE_OFFICER' } });
        for (const officer of stateOfficers) {
          await prisma.notification.create({
            data: {
              userId: officer.id,
              title: 'Overdue Batch Alert',
              message: `Batch ${batch.batchCode} has been pending for more than ${env.OVERDUE_THRESHOLD_HOURS} hours.`,
              type: 'OVERDUE_ALERT',
              entityId: batch.id,
              entityType: 'Batch',
            },
          });
        }
        logger.warn(`Marked batch ${batch.batchCode} as overdue`);
      }
      logger.info(`Overdue check complete. Found ${overdueBatches.length} overdue batches.`);
    } catch (err) {
      logger.error('Overdue check failed:', err);
    }
  });
  return job;
}
