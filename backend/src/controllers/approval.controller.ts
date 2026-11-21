import { Request, Response } from 'express';
import { z } from 'zod';
import { approvalService } from '../services/approval.service';
import { ApprovalDecision } from '../types/enums';

const decisionSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  reason: z.string().optional(),
});

export class ApprovalController {
  async submitDecision(req: Request, res: Response) {
    const { decision, reason } = decisionSchema.parse(req.body);
    if (
      (decision === ApprovalDecision.REJECTED || decision === ApprovalDecision.SENT_BACK) &&
      !reason
    ) {
      res
        .status(400)
        .json({ success: false, message: 'Reason is required for rejection/send-back' });
      return;
    }
    const result = await approvalService.submitDistrictDecision(
      req.user!,
      req.params.batchId,
      decision,
      reason
    );
    res.json({ success: true, data: result });
  }

  async getApprovals(req: Request, res: Response) {
    const approvals = await approvalService.getDistrictBatchStatus(req.params.batchId);
    res.json({ success: true, data: approvals });
  }
}

export const approvalController = new ApprovalController();

