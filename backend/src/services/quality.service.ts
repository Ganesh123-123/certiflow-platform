import { prisma } from '../config/database';
import { createAuditLog } from './audit.service';
import { JwtPayload } from '../types';
import { BatchStatus, ApprovalDecision } from '../types/enums';
import { AppError } from '../utils/AppError';

export class QualityService {
  async getPendingBatches(page = 1, pageSize = 20) {
    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where: { status: BatchStatus.QUALITY_REVIEW },
        include: {
          centre: true,
          district: true,
          approvals: { include: { officer: { select: { name: true } } } },
          _count: { select: { candidates: true } },
        },
        orderBy: { updatedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batch.count({ where: { status: BatchStatus.QUALITY_REVIEW } }),
    ]);
    return { batches, total, page, pageSize };
  }

  async submitReview(user: JwtPayload, batchId: string, decision: string, reason?: string) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError('Batch not found', 404);
    if (batch.status !== BatchStatus.QUALITY_REVIEW)
      throw new AppError('Batch is not in quality review', 400);

    const existing = await prisma.qualityReview.findUnique({ where: { batchId } });
    if (existing) throw new AppError('Quality review already submitted for this batch', 400);

    let nextStatus: string;
    if (decision === ApprovalDecision.APPROVED) {
      nextStatus = BatchStatus.STATE_REVIEW;
    } else if (decision === ApprovalDecision.REJECTED) {
      nextStatus = BatchStatus.REJECTED;
    } else {
      nextStatus = BatchStatus.SENT_BACK;
    }

    await prisma.$transaction(async (tx) => {
      await tx.qualityReview.create({
        data: { batchId, reviewerId: user.userId, decision, reason },
      });
      await tx.batch.update({
        where: { id: batchId },
        data: {
          status: nextStatus,
          rejectionReason: decision === ApprovalDecision.REJECTED ? reason : undefined,
          sendBackReason: decision === ApprovalDecision.SENT_BACK ? reason : undefined,
        },
      });
    });

    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: `QUALITY_${decision}`,
      entityType: 'Batch',
      entityId: batchId,
      previousState: BatchStatus.QUALITY_REVIEW,
      newState: nextStatus,
      reason,
      batchId,
    });

    return { batchId, decision, newStatus: nextStatus };
  }
}

export const qualityService = new QualityService();
