import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import 'express-async-errors';
import { env } from './config/env';
import { errorHandler, requestLogger } from './middleware/errorHandler';
import { apiRateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/auth';
import { Role } from './types/enums';

import authRoutes from './routes/auth.routes';
import batchRoutes from './routes/batch.routes';
import approvalRoutes from './routes/approval.routes';
import qualityRoutes from './routes/quality.routes';
import stateRoutes from './routes/state.routes';
import certificateRoutes from './routes/certificate.routes';
import notificationRoutes from './routes/notification.routes';
import auditRoutes from './routes/audit.routes';

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID + logging
app.use(requestLogger);

// Rate limiting
app.use('/api', apiRateLimiter);

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Static uploads (certificates) - protected via download endpoint
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/state', stateRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);

// Districts endpoint (public read)
app.get('/api/districts', async (_req, res, next) => {
  try {
    const { prisma } = await import('./config/database');
    const districts = await prisma.district.findMany({ orderBy: { name: 'asc' } });
    res.json({ success: true, data: districts });
  } catch (err) {
    next(err);
  }
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', authenticate, async (req, res, next) => {
  try {
    const { prisma } = await import('./config/database');
    const batchScope: any = {};
    if (req.user?.role === Role.TRAINING_CENTRE) {
      batchScope.centreId = req.user.centreId ?? '__no_centre__';
    } else if (req.user?.role === Role.DISTRICT_OFFICER) {
      batchScope.districtId = req.user.districtId ?? '__no_district__';
    }

    const [
      totalBatches,
      pendingBatches,
      approvedBatches,
      totalCertificates,
      deliveredCertificates,
      overdueBatches,
    ] = await Promise.all([
      prisma.batch.count({ where: batchScope }),
      prisma.batch.count({
        where: {
          ...batchScope,
          status: { in: ['DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW', 'OVERDUE'] },
        },
      }),
      prisma.batch.count({ where: { ...batchScope, status: 'APPROVED' } }),
      prisma.certificate.count({ where: { batch: batchScope } }),
      prisma.certificate.count({ where: { status: 'DELIVERED', batch: batchScope } }),
      prisma.batch.count({
        where: {
          ...batchScope,
          OR: [{ status: 'OVERDUE' }, { isOverdue: true }],
        },
      }),
    ]);
    res.json({
      success: true,
      data: {
        totalBatches,
        pendingBatches,
        approvedBatches,
        totalCertificates,
        deliveredCertificates,
        overdueBatches,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
