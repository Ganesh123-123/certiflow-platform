import { Router } from 'express';
import { stateController } from '../controllers/state.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '../types/enums';

const router = Router();
router.use(authenticate, authorize(Role.STATE_OFFICER));

router.get('/pending', (req, res, next) =>
  stateController.getPendingBatches(req, res).catch(next)
);
router.get('/all-batches', (req, res, next) =>
  stateController.getAllBatches(req, res).catch(next)
);
router.post('/:batchId/decision', (req, res, next) =>
  stateController.approveOrReject(req, res).catch(next)
);
router.post('/certificates/:certificateNumber/revoke', (req, res, next) =>
  stateController.revokeCertificate(req, res).catch(next)
);
router.get('/overdue', (req, res, next) =>
  stateController.getOverdueBatches(req, res).catch(next)
);
router.get('/audit-logs', (req, res, next) =>
  stateController.getAuditLogs(req, res).catch(next)
);

export default router;

