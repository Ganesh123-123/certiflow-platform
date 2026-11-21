import { Router } from 'express';
import multer from 'multer';
import { batchController } from '../controllers/batch.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '../types/enums';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/plain',
    ];
    if (
      allowed.includes(file.mimetype) ||
      file.originalname.endsWith('.csv') ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and XLSX files are allowed.'));
    }
  },
});

router.use(authenticate);

router.post('/', authorize(Role.TRAINING_CENTRE), (req, res, next) =>
  batchController.createBatch(req, res).catch(next)
);
router.get('/my', authorize(Role.TRAINING_CENTRE), (req, res, next) =>
  batchController.getMyBatches(req, res).catch(next)
);
router.get('/district', authorize(Role.DISTRICT_OFFICER), (req, res, next) =>
  batchController.getDistrictBatches(req, res).catch(next)
);
router.get('/all', authorize(Role.STATE_OFFICER, Role.QUALITY_TEAM), (req, res, next) =>
  batchController.getAllBatches(req, res).catch(next)
);
router.get(
  '/status/:status',
  authorize(Role.TRAINING_CENTRE, Role.DISTRICT_OFFICER, Role.QUALITY_TEAM, Role.STATE_OFFICER),
  (req, res, next) => batchController.getBatchesByStatus(req, res).catch(next)
);
router.get('/:id', (req, res, next) =>
  batchController.getBatchDetails(req, res).catch(next)
);
router.post(
  '/:id/candidates',
  authorize(Role.TRAINING_CENTRE),
  upload.single('file'),
  (req, res, next) => batchController.uploadCandidates(req, res).catch(next)
);
router.post('/:id/submit', authorize(Role.TRAINING_CENTRE), (req, res, next) =>
  batchController.submitBatch(req, res).catch(next)
);

export default router;

