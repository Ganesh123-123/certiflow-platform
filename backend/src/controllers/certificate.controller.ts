import { Request, Response } from 'express';
import fs from 'fs';
import { prisma } from '../config/database';
import { CertificateStatus, Role } from '../types/enums';
import { z } from 'zod';

const certificateListQuery = z.object({
  status: z.nativeEnum(CertificateStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export class CertificateController {
  async getCertificates(req: Request, res: Response) {
    const { status, page } = certificateListQuery.parse(req.query);
    const user = req.user!;
    const where: any = {};
    if (status) where.status = status;

    if (user.role === Role.TRAINING_CENTRE) {
      where.batch = { centreId: user.centreId ?? '__no_centre__' };
    } else if (user.role === Role.DISTRICT_OFFICER) {
      where.batch = { districtId: user.districtId ?? '__no_district__' };
    }

    const pageSize = 20;
    const [certificates, total] = await Promise.all([
      prisma.certificate.findMany({
        where,
        include: {
          candidate: { select: { fullName: true, courseName: true } },
          batch: {
            select: {
              batchCode: true,
              district: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.certificate.count({ where }),
    ]);

    res.json({ success: true, data: { certificates, total, page, pageSize } });
  }

  async verifyCertificate(req: Request, res: Response) {
    const { certificateNumber } = req.params;
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: {
        candidate: {
          select: {
            fullName: true,
            courseName: true,
            trainingCentre: true,
            completionDate: true,
          },
        },
      },
    });

    if (!cert) {
      res.json({ success: true, data: { status: 'NOT_FOUND' } });
      return;
    }

    if (cert.status === CertificateStatus.REVOKED) {
      res.json({
        success: true,
        data: {
          status: 'REVOKED',
          certificateNumber: cert.certificateNumber,
          revokedAt: cert.revokedAt,
          revocationReason: cert.revocationReason,
        },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        status: 'VALID',
        certificateNumber: cert.certificateNumber,
        candidateName: cert.candidate.fullName,
        courseName: cert.candidate.courseName,
        trainingCentre: cert.candidate.trainingCentre,
        completionDate: cert.candidate.completionDate,
        issuedAt: cert.issuedAt,
      },
    });
  }

  async downloadCertificate(req: Request, res: Response) {
    const { certificateNumber } = req.params;
    const cert = await prisma.certificate.findUnique({
      where: { certificateNumber },
      include: { candidate: { select: { batchId: true } } },
    });

    if (!cert || !cert.pdfPath) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }
    if (cert.status === CertificateStatus.REVOKED) {
      res.status(403).json({ success: false, message: 'Certificate has been revoked' });
      return;
    }

    if (!fs.existsSync(cert.pdfPath)) {
      res.status(404).json({ success: false, message: 'Certificate file not found' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${certificateNumber}.pdf"`
    );
    fs.createReadStream(cert.pdfPath).pipe(res);
  }

  async getCertificatesByBatch(req: Request, res: Response) {
    const certs = await prisma.certificate.findMany({
      where: { batchId: req.params.batchId },
      include: {
        candidate: { select: { fullName: true, email: true, mobile: true } },
        deliveries: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    res.json({ success: true, data: certs });
  }
}

export const certificateController = new CertificateController();

