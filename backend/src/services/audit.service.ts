import { prisma } from '../config/database';

interface AuditLogEntry {
  userId: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  requestId?: string;
  batchId?: string;
  metadata?: Record<string, unknown>;
}

export async function createAuditLog(entry: AuditLogEntry): Promise<void> {
  await prisma.auditLog.create({
    data: {
      ...entry,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : undefined,
    },
  });
}
