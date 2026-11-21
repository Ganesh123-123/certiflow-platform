import { Request, Response } from 'express';
import { z } from 'zod';
import { qualityService } from '../services/quality.service';
import { ApprovalDecision } from '../types/enums';

const reviewSchema = z.object({
  decision: z.nativeEnum(ApprovalDecision),
  reason: z.string().optional(),
});

export class QualityController {
  async getPendingBatches(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const result = await qualityService.getPendingBatches(page);
    res.json({ success: true, data: result });
  }

  async submitReview(req: Request, res: Response) {
    const { decision, reason } = reviewSchema.parse(req.body);
    const result = await qualityService.submitReview(
      req.user!,
      req.params.batchId,
      decision,
      reason
    );
    res.json({ success: true, data: result });
  }
}

export const qualityController = new QualityController();

