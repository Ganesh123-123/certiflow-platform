import { prisma } from '../config/database';
import { parseCandidateFile } from '../utils/csv.parser';
import { createAuditLog } from './audit.service';
import { JwtPayload } from '../types';
import { BatchStatus, Role } from '../types/enums';
import { AppError } from '../utils/AppError';

export class BatchService {
  async createBatch(user: JwtPayload, data: { courseName: string; districtId: string }) {
    if (!user.centreId) throw new AppError('User is not associated with a training centre');

    const batchCode = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const batch = await prisma.batch.create({
      data: {
        batchCode,
        centreId: user.centreId,
        districtId: data.districtId,
        submittedById: user.userId,
        courseName: data.courseName,
        status: BatchStatus.DRAFT,
      },
      include: { centre: true, district: true },
    });

    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: 'BATCH_CREATED',
      entityType: 'Batch',
      entityId: batch.id,
      newState: BatchStatus.DRAFT,
      batchId: batch.id,
    });

    return batch;
  }

  async uploadCandidates(user: JwtPayload, batchId: string, file: Express.Multer.File) {
    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) throw new AppError('Batch not found', 404);
    if (batch.submittedById !== user.userId) throw new AppError('Unauthorized: not your batch', 403);
    if (batch.status !== BatchStatus.DRAFT && batch.status !== BatchStatus.SENT_BACK) {
      throw new AppError('Cannot upload candidates to this batch in its current state');
    }

    const { valid, errors } = parseCandidateFile(file.buffer, file.mimetype, file.originalname);

    if (errors.length > 0) {
      return { success: false, errors, validCount: valid.length };
    }

    if (valid.length === 0) {
      return {
        success: false,
        errors: [{ row: 0, field: 'file', message: 'No valid candidates found' }],
        validCount: 0,
      };
    }

    // Atomic: delete existing candidates, insert all new ones
    await prisma.$transaction(async (tx) => {
      await tx.candidate.deleteMany({ where: { batchId } });
      await tx.candidate.createMany({
        data: valid.map((c, idx) => ({
          batchId,
          districtId: batch.districtId,
          fullName: c.fullName,
          email: c.email.toLowerCase(),
          mobile: c.mobile,
          dateOfBirth: new Date(c.dateOfBirth),
          gender: c.gender.toLowerCase(),
          courseName: c.courseName,
          trainingCentre: c.trainingCentre,
          completionDate: new Date(c.completionDate),
          rowNumber: idx + 2,
        })),
      });

      await tx.batch.update({
        where: { id: batchId },
        data: { totalCandidates: valid.length },
      });
    });

    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: 'CANDIDATES_UPLOADED',
      entityType: 'Batch',
      entityId: batchId,
      batchId,
      metadata: { candidateCount: valid.length },
    });

    return { success: true, errors: [], validCount: valid.length };
  }

  async submitBatch(user: JwtPayload, batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { _count: { select: { candidates: true } } },
    });
    if (!batch) throw new AppError('Batch not found', 404);
    if (batch.submittedById !== user.userId) throw new AppError('Unauthorized: not your batch', 403);
    if (batch.status !== BatchStatus.DRAFT && batch.status !== BatchStatus.SENT_BACK) {
      throw new AppError(`Cannot submit batch in status: ${batch.status}`);
    }
    if (batch._count.candidates === 0) throw new AppError('Cannot submit batch with no candidates');

    const updated = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: BatchStatus.DISTRICT_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
        sendBackReason: null,
      },
      include: { centre: true, district: true },
    });

    await createAuditLog({
      userId: user.userId,
      userRole: user.role,
      action: 'BATCH_SUBMITTED',
      entityType: 'Batch',
      entityId: batchId,
      previousState: batch.status,
      newState: BatchStatus.DISTRICT_REVIEW,
      batchId,
    });

    return updated;
  }

  async getBatchesForCentre(user: JwtPayload, page = 1, pageSize = 20) {
    if (!user.centreId) throw new AppError('No centre associated', 400);
    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where: { centreId: user.centreId },
        include: {
          district: true,
          centre: true,
          approvals: { include: { officer: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batch.count({ where: { centreId: user.centreId } }),
    ]);
    return { batches, total, page, pageSize };
  }

  async getBatchesForDistrict(user: JwtPayload, status?: string, page = 1, pageSize = 20) {
    if (!user.districtId) throw new AppError('No district associated', 400);
    const where: any = { districtId: user.districtId };
    if (status) where.status = status;
    else where.status = { in: [BatchStatus.DISTRICT_REVIEW, BatchStatus.OVERDUE] };

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          centre: true,
          district: true,
          approvals: { include: { officer: { select: { id: true, name: true } } } },
          _count: { select: { candidates: true } },
        },
        orderBy: { submittedAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batch.count({ where }),
    ]);
    return { batches, total, page, pageSize };
  }

  async getBatchDetails(batchId: string) {
    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: {
        centre: true,
        district: true,
        submittedBy: { select: { id: true, name: true, email: true } },
        candidates: { orderBy: { rowNumber: 'asc' } },
        approvals: { include: { officer: { select: { id: true, name: true, role: true } } } },
        qualityReview: { include: { reviewer: { select: { id: true, name: true } } } },
        stateReview: true,
        certificates: { select: { id: true, certificateNumber: true, status: true, issuedAt: true } },
      },
    });
    if (!batch) throw new AppError('Batch not found', 404);
    return batch;
  }

  async getAllBatches(page = 1, pageSize = 20, status?: string) {
    const where: any = {};
    if (status) where.status = status;

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          centre: true,
          district: true,
          approvals: { include: { officer: { select: { id: true, name: true } } } },
          qualityReview: true,
          _count: { select: { candidates: true, certificates: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batch.count({ where }),
    ]);
    return { batches, total, page, pageSize };
  }

  async getBatchesByStatus(user: JwtPayload, status: BatchStatus, page = 1, pageSize = 20) {
    const where: any = status === BatchStatus.OVERDUE
      ? { OR: [{ status: BatchStatus.OVERDUE }, { isOverdue: true }] }
      : { status };

    if (user.role === Role.TRAINING_CENTRE) {
      where.centreId = user.centreId ?? '__no_centre__';
    } else if (user.role === Role.DISTRICT_OFFICER) {
      where.districtId = user.districtId ?? '__no_district__';
    }

    const [batches, total] = await Promise.all([
      prisma.batch.findMany({
        where,
        include: {
          centre: true,
          district: true,
          _count: { select: { candidates: true } },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.batch.count({ where }),
    ]);

    return { batches, total, page, pageSize };
  }
}

export const batchService = new BatchService();
