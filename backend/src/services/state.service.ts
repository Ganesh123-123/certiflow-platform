import { prisma } from '../config/database';
import { createAuditLog } from './audit.service';
import { JwtPayload } from '../types';
import { BatchStatus, ApprovalDecision, CertificateStatus } from '../types/enums';
import { addCertificateGenerationJob } from '../queues/certificate.queue';
import { AppError } from '../utils/AppError';

export class StateService {
  async getPendingBatches(page = 1, pageSize = 20) {
    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where: { status: BatchStatus.STATE_REVIEW },
        include: {
          centre: true,
          district: true,
          approvals: { include: { officer: { select: { name: true } } } },
          qualityReview: { include: { reviewer: { select: { name: true } } } },
          _count: { select: { candidates: true } },
        },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batch.count({ where: { status: BatchStatus.STATE_REVIEW } }),
    ]);
    return { batches, total, page, pageSize };
  }

  async approveOrReject(
    user: JwtPayload,
    batchId: string,
    decision: string,
    reason?: string
  ) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { candidates: true, district: true },
    });
    if (!batch) throw new AppError('Batch not found', 404);
    if (batch.status !== BatchStatus.STATE_REVIEW) throw new AppError('Batch not in state review', 400);

    const existing = await prisma.stateReview.findUnique({ where: { batchId } });
    if (existing) throw new AppError('State review already submitted', 400);

    await prisma.$transaction(async (tx) => {
      await tx.stateReview.create({
        data: { batchId, officerId: user.userId, decision, reason },
      });

      let nextStatus: string;
      if (decision === ApprovalDecision.APPROVED) {
        nextStatus = BatchStatus.APPROVED;
      } else if (decision === ApprovalDecision.REJECTED) {
        nextStatus = BatchStatus.REJECTED;
      } else {
        nextStatus = BatchStatus.SENT_BACK;
      }

      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: nextStatus,
          approvedAt: decision === ApprovalDecision.APPROVED ? new Date() : undefined,
          rejectionReason: decision === ApprovalDecision.REJECTED ? reason : undefined,
          sendBackReason: decision === ApprovalDecision.SENT_BACK ? reason : undefined,
        },
      });

      if (decision === ApprovalDecision.APPROVED) {
        for (const candidate of batch.candidates) {
          await addCertificateGenerationJob({
            candidateId: candidate.id,
            batchId: batch.id,
            districtCode: batch.district.code,
          });
        }
      }
    });

    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: `STATE_${decision}`,
      entityType: 'Batch',
      entityId: batchId,
      previousState: BatchStatus.STATE_REVIEW,
      newState: decision,
      reason,
      batchId,
    });

    return { batchId, decision };
  }

  async revokeCertificate(user: JwtPayload, certificateNumber: string, reason: string) {
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: { candidate: true },
    });
    if (!cert) throw new AppError('Certificate not found', 404);
    if (cert.status === CertificateStatus.REVOKED) throw new AppError('Already revoked', 400);

    await prisma.certificate.update({
      where: { certificateNumber },
      data: {
        status: CertificateStatus.REVOKED,
        revokedAt: new Date(),
        revocationReason: reason,
      },
    });

    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: 'CERTIFICATE_REVOKED',
      entityType: 'Certificate',
      entityId: cert.id,
      previousState: cert.status,
      newState: CertificateStatus.REVOKED,
      reason,
      batchId: cert.batchId,
    });

    return { certificateNumber, status: CertificateStatus.REVOKED };
  }

  async getOverdueBatches() {
    return prisma.batch.findMany({
      where: { isOverdue: true },
      include: { centre: true, district: true, _count: { select: { candidates: true } } },
      orderBy: { overdueAt: 'asc' },
    });
  }

  async getAuditLogs(page = 1, pageSize = 50) {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count(),
    ]);
    return { logs, total, page, pageSize };
  }
}

export const stateService = new StateService();
