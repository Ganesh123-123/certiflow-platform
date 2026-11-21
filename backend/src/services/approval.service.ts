import { prisma } from '../config/database';
import { createAuditLog } from './audit.service';
import { JwtPayload } from '../types';
import { BatchStatus, ApprovalDecision } from '../types/enums';
import { addCertificateGenerationJob } from '../queues/certificate.queue';
import { AppError } from '../utils/AppError';

const REQUIRED_DISTRICT_APPROVALS = 2;
const QUALITY_REVIEW_THRESHOLD = parseInt(process.env.QUALITY_REVIEW_THRESHOLD || '50');

export class ApprovalService {
  async submitDistrictDecision(
    user: JwtPayload,
    batchId: string,
    decision: string,
    reason?: string
  ) {
    if (!user.districtId) throw new AppError('No district associated with this officer', 400);

    return await prisma.$transaction(async (tx) => {
      const batch = await tx.batch.findUnique({ where: { id: batchId } });
      if (!batch) throw new AppError('Batch not found', 404);
      if (batch.districtId !== user.districtId)
        throw new AppError('This batch belongs to a different district', 400);
      if (
        batch.status !== BatchStatus.DISTRICT_REVIEW &&
        batch.status !== BatchStatus.OVERDUE
      ) {
        throw new AppError(`Batch is not in district review (current: ${batch.status})`, 400);
      }

      const existing = await tx.approval.findUnique({
        where: { batchId_officerId: { batchId, officerId: user.userId } },
      });
      if (existing) throw new AppError('You have already submitted a decision for this batch', 400);

      const approval = await tx.approval.create({
        data: { batchId, officerId: user.userId, decision, reason },
      });

      await createAuditLog({
        userId: user.userId,
        userRole: user.role,
        action: `DISTRICT_${decision}`,
        entityType: 'Batch',
        entityId: batchId,
        previousState: batch.status,
        newState: decision === ApprovalDecision.APPROVED ? 'PENDING_SECOND_APPROVAL' : decision,
        reason,
        batchId,
      });

      if (decision === ApprovalDecision.REJECTED) {
        await tx.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.REJECTED, rejectionReason: reason },
        });
        return { approval, batchStatus: BatchStatus.REJECTED };
      }

      if (decision === ApprovalDecision.SENT_BACK) {
        await tx.batch.update({
          where: { id: batchId },
          data: { status: BatchStatus.SENT_BACK, sendBackReason: reason },
        });
        return { approval, batchStatus: BatchStatus.SENT_BACK };
      }

      // APPROVED - check if we have enough approvals
      const approvalCount = await tx.approval.count({
        where: { batchId, decision: ApprovalDecision.APPROVED },
      });

      if (approvalCount >= REQUIRED_DISTRICT_APPROVALS) {
        const nextStatus =
          batch.totalCandidates > QUALITY_REVIEW_THRESHOLD
            ? BatchStatus.QUALITY_REVIEW
            : BatchStatus.STATE_REVIEW;

        await tx.batch.update({
          where: { id: batchId },
          data: { status: nextStatus, isOverdue: false, overdueAt: null },
        });

        await createAuditLog({
          userId: user.userId,
          userRole: user.role,
          action: 'DISTRICT_APPROVED_FINAL',
          entityType: 'Batch',
          entityId: batchId,
          previousState: BatchStatus.DISTRICT_REVIEW,
          newState: nextStatus,
          batchId,
        });

        return { approval, batchStatus: nextStatus };
      }

      return { approval, batchStatus: batch.status };
    });
  }

  async getDistrictBatchStatus(batchId: string) {
    const approvals = await prisma.approval.findMany({
      where: { batchId },
      include: { officer: { select: { id: true, name: true } } },
    });
    return approvals;
  }
}

export const approvalService = new ApprovalService();
