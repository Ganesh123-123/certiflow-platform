import { Router } from 'express';
import { approvalController } from '../controllers/approval.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '../types/enums';

const router = Router();
router.use(authenticate);

router.post('/:batchId', authorize(Role.DISTRICT_OFFICER), (req, res, next) =>
  approvalController.submitDecision(req, res).catch(next)
);
router.get('/:batchId', (req, res, next) =>
  approvalController.getApprovals(req, res).catch(next)
);

export default router;

