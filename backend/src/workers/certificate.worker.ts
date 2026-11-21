import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { prisma } from '../config/database';
import { generateCertificatePDF } from '../utils/pdf.generator';
import { generateCertificateNumber } from '../utils/certificate.number';
import { addWhatsappDeliveryJob } from '../queues/certificate.queue';
import { CertificateStatus } from '../types/enums';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export function startCertificateWorker() {
  try {
    const worker = new Worker(
      'certificate-generation',
      async (job: Job) => {
        const { candidateId, batchId, districtCode } = job.data;
        logger.info(`Processing certificate job for candidate ${candidateId}`);

        const existing = await prisma.certificate.findUnique({ where: { candidateId } });
        if (existing && existing.status === CertificateStatus.GENERATED) return { certificateNumber: existing.certificateNumber };
        if (existing && existing.status === CertificateStatus.DELIVERED) return { certificateNumber: existing.certificateNumber };

        const candidate = await prisma.candidate.findUnique({
          where: { id: candidateId },
          include: { batch: { include: { district: true, centre: true } } },
        });
        if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

        const certNumber = await generateCertificateNumber(districtCode);
        const verificationUrl = `${env.PUBLIC_VERIFY_URL}/${certNumber}`;

        let certificate = existing;
        if (!certificate) {
          certificate = await prisma.certificate.create({
            data: { certificateNumber: certNumber, batchId, candidateId, status: CertificateStatus.PENDING },
          });
        }

        const pdfPath = await generateCertificatePDF({
          certificateNumber: certNumber,
          studentName: candidate.fullName,
          courseName: candidate.courseName,
          trainingCentre: candidate.trainingCentre,
          completionDate: candidate.completionDate,
          issueDate: new Date(),
          verificationUrl,
        });

        await prisma.certificate.update({
          where: { id: certificate.id },
          data: { status: CertificateStatus.GENERATED, pdfPath, pdfUrl: `/api/certificates/${certNumber}/download`, issuedAt: new Date() },
        });

        await addWhatsappDeliveryJob({ certificateId: certificate.id, certificateNumber: certNumber, candidatePhone: candidate.mobile, candidateName: candidate.fullName });

        logger.info(`Certificate generated: ${certNumber} for ${candidate.fullName}`);
        return { certificateNumber: certNumber, pdfPath };
      },
      { connection: redisConnection, concurrency: 5 }
    );
    worker.on('failed', (job, err) => logger.error(`Certificate job failed: ${job?.id}`, { error: err.message }));
    worker.on('completed', (job) => logger.info(`Certificate job completed: ${job.id}`));
    return worker;
  } catch (err: any) {
    logger.warn('Certificate worker could not start (Redis unavailable) — jobs run inline:', err.message);
    return null;
  }
}
