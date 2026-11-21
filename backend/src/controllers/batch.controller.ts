import { Request, Response } from 'express';
import { z } from 'zod';
import { batchService } from '../services/batch.service';
import { BatchStatus } from '../types/enums';

const createBatchSchema = z.object({
  courseName: z.string().min(2).max(200),
  districtId: z.string().cuid(),
});

export class BatchController {
  async createBatch(req: Request, res: Response) {
    const data = createBatchSchema.parse(req.body);
    const batch = await batchService.createBatch(req.user!, data);
    res.status(201).json({ success: true, data: batch });
  }

  async uploadCandidates(req: Request, res: Response) {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
    const result = await batchService.uploadCandidates(req.user!, req.params.id, req.file);
    res.status(result.success ? 200 : 422).json({ success: result.success, data: result });
  }

  async submitBatch(req: Request, res: Response) {
    const batch = await batchService.submitBatch(req.user!, req.params.id);
    res.json({ success: true, data: batch });
  }

  async getMyBatches(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const result = await batchService.getBatchesForCentre(req.user!, page);
    res.json({ success: true, data: result });
  }

  async getDistrictBatches(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const status = req.query.status as BatchStatus | undefined;
    const result = await batchService.getBatchesForDistrict(req.user!, status, page);
    res.json({ success: true, data: result });
  }

  async getBatchDetails(req: Request, res: Response) {
    const batch = await batchService.getBatchDetails(req.params.id);
    res.json({ success: true, data: batch });
  }

  async getAllBatches(req: Request, res: Response) {
    const page = parseInt(req.query.page as string) || 1;
    const status = req.query.status as BatchStatus | undefined;
    const result = await batchService.getAllBatches(page, 20, status);
    res.json({ success: true, data: result });
  }

  async getBatchesByStatus(req: Request, res: Response) {
    const status = z.nativeEnum(BatchStatus).parse(req.params.status);
    const page = parseInt(req.query.page as string) || 1;
    const result = await batchService.getBatchesByStatus(req.user!, status, page);
    res.json({ success: true, data: result });
  }
}

export const batchController = new BatchController();

