import { Router } from 'express';
import { qualityController } from '../controllers/quality.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '../types/enums';

const router = Router();
router.use(authenticate, authorize(Role.QUALITY_TEAM));

router.get('/pending', (req, res, next) =>
  qualityController.getPendingBatches(req, res).catch(next)
);
router.post('/:batchId/review', (req, res, next) =>
  qualityController.submitReview(req, res).catch(next)
);

export default router;

