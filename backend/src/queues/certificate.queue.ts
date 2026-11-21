// Certificate & WhatsApp queues
// Falls back to inline execution when Redis is unavailable

export const CERTIFICATE_QUEUE = 'certificate-generation';
export const WHATSAPP_QUEUE = 'whatsapp-delivery';

let certQueue: any = null;
let waQueue: any = null;

function getCertQueue() {
  if (!certQueue) {
    try {
      const { Queue } = require('bullmq');
      const { redisConnection } = require('../config/redis');
      certQueue = new Queue(CERTIFICATE_QUEUE, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      });
    } catch (e) {
      certQueue = null;
    }
  }
  return certQueue;
}

function getWaQueue() {
  if (!waQueue) {
    try {
      const { Queue } = require('bullmq');
      const { redisConnection } = require('../config/redis');
      waQueue = new Queue(WHATSAPP_QUEUE, {
        connection: redisConnection,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 3000 },
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      });
    } catch (e) {
      waQueue = null;
    }
  }
  return waQueue;
}

// Inline job runner used when Redis/BullMQ unavailable
async function runCertInline(data: { candidateId: string; batchId: string; districtCode: string }) {
  try {
    const { prisma } = await import('../config/database');
    const { generateCertificatePDF } = await import('../utils/pdf.generator');
    const { generateCertificateNumber } = await import('../utils/certificate.number');
    const { addWhatsappDeliveryJob } = await import('../queues/certificate.queue');
    const { env } = await import('../config/env');

    const existing = await prisma.certificate.findUnique({ where: { candidateId: data.candidateId } });
    if (existing && (existing.status === 'GENERATED' || existing.status === 'DELIVERED')) return;

    const candidate = await prisma.candidate.findUnique({
      where: { id: data.candidateId },
      include: { batch: { include: { district: true, centre: true } } },
    });
    if (!candidate) return;

    const certNumber = await generateCertificateNumber(data.districtCode);
    const verificationUrl = `${env.PUBLIC_VERIFY_URL}/${certNumber}`;

    let certificate = existing;
    if (!certificate) {
      certificate = await prisma.certificate.create({
        data: { certificateNumber: certNumber, batchId: data.batchId, candidateId: data.candidateId, status: 'PENDING' },
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
      data: { status: 'GENERATED', pdfPath, pdfUrl: `/api/certificates/${certNumber}/download`, issuedAt: new Date() },
    });

    // Queue WhatsApp delivery
    await addWhatsappDeliveryJob({
      certificateId: certificate.id,
      certificateNumber: certNumber,
      candidatePhone: candidate.mobile,
      candidateName: candidate.fullName,
    });

    console.log(`✅ Certificate generated inline: ${certNumber}`);
  } catch (err: any) {
    console.error('Inline cert generation failed:', err.message);
  }
}

async function runWaInline(data: { certificateId: string; certificateNumber: string; candidatePhone: string; candidateName: string }) {
  try {
    const { prisma } = await import('../config/database');
    const { sendWhatsAppMessage } = await import('../providers/whatsapp.mock');
    const { env } = await import('../config/env');

    const cert = await prisma.certificate.findUnique({ where: { id: data.certificateId } });
    if (cert?.status === 'DELIVERED') return;

    const verificationUrl = `${env.PUBLIC_VERIFY_URL}/${data.certificateNumber}`;
    const result = await sendWhatsAppMessage({
      to: data.candidatePhone,
      candidateName: data.candidateName,
      certificateNumber: data.certificateNumber,
      verificationUrl,
    });

    if (result.success) {
      await prisma.$transaction([
        prisma.deliveryAttempt.create({
          data: { certificateId: data.certificateId, attemptNumber: 1, status: 'DELIVERED', deliveredAt: result.deliveredAt },
        }),
        prisma.certificate.update({ where: { id: data.certificateId }, data: { status: 'DELIVERED' } }),
      ]);
      console.log(`✅ WhatsApp delivered inline: ${data.certificateNumber}`);
    } else {
      console.warn(`⚠️  WhatsApp delivery failed inline: ${result.error}`);
    }
  } catch (err: any) {
    console.error('Inline WhatsApp delivery failed:', err.message);
  }
}

export async function addCertificateGenerationJob(data: {
  candidateId: string;
  batchId: string;
  districtCode: string;
}) {
  const q = getCertQueue();
  if (q) {
    try {
      return await q.add('generate-certificate', data, { jobId: `cert-${data.candidateId}` });
    } catch (e) {
      // Redis down — run inline after short delay
    }
  }
  // Run inline asynchronously (non-blocking)
  setTimeout(() => runCertInline(data), 100);
  return null;
}

export async function addWhatsappDeliveryJob(data: {
  certificateId: string;
  certificateNumber: string;
  candidatePhone: string;
  candidateName: string;
}) {
  const q = getWaQueue();
  if (q) {
    try {
      return await q.add('deliver-whatsapp', data, { jobId: `wa-${data.certificateId}` });
    } catch (e) {
      // Redis down — run inline
    }
  }
  // Run inline asynchronously (non-blocking)
  setTimeout(() => runWaInline(data), 500);
  return null;
}

// Aliases
export const certificateGenerationQueue = { add: addCertificateGenerationJob } as any;
export const whatsappDeliveryQueue = { add: addWhatsappDeliveryJob } as any;
export const certificateQueue = certificateGenerationQueue;
