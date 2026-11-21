import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { sendWhatsAppMessage } from '../providers/whatsapp.mock';
import { CertificateStatus } from '../types/enums';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function startWhatsAppWorker() {
  try {
    const worker = new Worker(
      'whatsapp-delivery',
      async (job: Job) => {
        const { certificateId, certificateNumber, candidatePhone, candidateName } = job.data;
        const attemptNumber = (job.attemptsMade || 0) + 1;
        logger.info(`WhatsApp delivery attempt ${attemptNumber} for certificate ${certificateNumber}`);

        const certificate = await prisma.certificate.findUnique({ where: { id: certificateId } });
        if (certificate?.status === CertificateStatus.DELIVERED) return { alreadyDelivered: true };

        const verificationUrl = `${env.PUBLIC_VERIFY_URL}/${certificateNumber}`;
        let deliveryAttempt;
        try {
          deliveryAttempt = await prisma.deliveryAttempt.create({ data: { certificateId, attemptNumber, status: 'PENDING' } });
        } catch (e: any) {
          if (e.code === 'P2002') {
            deliveryAttempt = await prisma.deliveryAttempt.findUnique({ where: { certificateId_attemptNumber: { certificateId, attemptNumber } } });
          } else throw e;
        }

        const result = await sendWhatsAppMessage({ to: candidatePhone, candidateName, certificateNumber, verificationUrl });

        if (result.success) {
          await prisma.$transaction([
            prisma.deliveryAttempt.update({ where: { id: deliveryAttempt!.id }, data: { status: 'DELIVERED', deliveredAt: result.deliveredAt } }),
            prisma.certificate.update({ where: { id: certificateId }, data: { status: CertificateStatus.DELIVERED } }),
          ]);
          logger.info(`WhatsApp delivered: ${certificateNumber} to ${candidatePhone}`);
          return { delivered: true };
        } else {
          await prisma.deliveryAttempt.update({ where: { id: deliveryAttempt!.id }, data: { status: 'FAILED', errorMessage: result.error } });
          throw new Error(result.error || 'WhatsApp delivery failed');
        }
      },
      { connection: redisConnection, concurrency: 10 }
    );
    worker.on('failed', async (job, err) => {
      if (job && job.attemptsMade >= env.WHATSAPP_MAX_RETRIES) {
        await prisma.certificate.update({ where: { id: job.data.certificateId }, data: { status: CertificateStatus.FAILED } }).catch(() => {});
      }
    });
    return worker;
  } catch (err: any) {
    logger.warn('WhatsApp worker could not start (Redis unavailable) — deliveries run inline:', err.message);
    return null;
  }
}
