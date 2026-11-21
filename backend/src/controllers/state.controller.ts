import { Request, Response } from 'express';
import { z } from 'zod';
import { stateService } from '../services/state.service';
import { ApprovalDecision } from '../types/enums';

const decisionSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  reason: z.string().optional(),
});

const revokeSchema = z.object({
  reason: z.string().min(10, 'Revocation reason must be at least 10 characters'),
});

export class StateController {
  async getPendingBatches(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const result = await stateService.getPendingBatches(page);
    res.json({ success: true, data: result });
  }

  async approveOrReject(req: Request, res: Response) {
    const { decision, reason } = decisionSchema.parse(req.body);
    const result = await stateService.approveOrReject(
      req.user!,
      req.params.batchId,
      decision,
      reason
    );
    res.json({ success: true, data: result });
  }

  async revokeCertificate(req: Request, res: Response) {
    const { reason } = revokeSchema.parse(req.body);
    const result = await stateService.revokeCertificate(
      req.user!,
      req.params.certificateNumber,
      reason
    );
    res.json({ success: true, data: result });
  }

  async getOverdueBatches(req: Request, res: Response) {
    const batches = await stateService.getOverdueBatches();
    res.json({ success: true, data: batches });
  }

  async getAuditLogs(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const result = await stateService.getAuditLogs(page);
    res.json({ success: true, data: result });
  }

  async getAllBatches(req: Request, res: Response) {
    const { batchService } = await import('../services/batch.service');
    const page = parseInt(req.query.page as string) || 1;
    const status = req.query.status as any;
    const result = await batchService.getAllBatches(page, 20, status);
    res.json({ success: true, data: result });
  }
}

export const stateController = new StateController();

