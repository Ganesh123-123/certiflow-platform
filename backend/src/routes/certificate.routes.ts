import { Router } from 'express';
import { certificateController } from '../controllers/certificate.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, (req, res, next) =>
  certificateController.getCertificates(req, res).catch(next)
);

// Public verification endpoint
router.get('/verify/:certificateNumber', (req, res, next) =>
  certificateController.verifyCertificate(req, res).catch(next)
);

// Protected download
router.get('/:certificateNumber/download', authenticate, (req, res, next) =>
  certificateController.downloadCertificate(req, res).catch(next)
);
router.get('/batch/:batchId', authenticate, (req, res, next) =>
  certificateController.getCertificatesByBatch(req, res).catch(next)
);

export default router;
