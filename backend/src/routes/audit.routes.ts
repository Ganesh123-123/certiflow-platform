import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/rbac';
import { Role } from '../types/enums';
import { prisma } from '../config/database';

const router = Router();
router.use(authenticate, authorize(Role.STATE_OFFICER));

router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 50;
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ success: true, data: { logs, total, page } });
  } catch (err) {
    next(err);
  }
});

export default router;

