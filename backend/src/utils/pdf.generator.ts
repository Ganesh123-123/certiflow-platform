import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import { env } from '../config/env';

interface CertificateData {
  certificateNumber: string;
  studentName: string;
  courseName: string;
  trainingCentre: string;
  completionDate: Date;
  issueDate: Date;
  verificationUrl: string;
}

export async function generateCertificatePDF(data: CertificateData): Promise<string> {
  const uploadDir = path.resolve(env.UPLOAD_DIR, 'certificates');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const fileName = `${data.certificateNumber.replace(/\//g, '-')}.pdf`;
  const filePath = path.join(uploadDir, fileName);

  return new Promise(async (resolve, reject) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(data.verificationUrl, {
        width: 150,
        margin: 1,
      });
      const qrBuffer = Buffer.from(qrCodeDataUrl.split(',')[1], 'base64');

      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 50,
      });

      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Background
      doc.rect(0, 0, doc.page.width, doc.page.height).fill('#F0F4FF');

      // Border
      doc
        .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
        .strokeColor('#2563EB')
        .lineWidth(3)
        .stroke();

      // Header
      doc
        .fillColor('#1E40AF')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text('PRAGATI SKILLS MISSION', 0, 60, { align: 'center' });

      doc
        .fillColor('#3B82F6')
        .fontSize(14)
        .font('Helvetica')
        .text('Government of India – Skill Development Initiative', 0, 95, { align: 'center' });

      // Divider
      doc
        .moveTo(50, 120)
        .lineTo(doc.page.width - 50, 120)
        .strokeColor('#2563EB')
        .lineWidth(1)
        .stroke();

      // Certificate title
      doc
        .fillColor('#111827')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('CERTIFICATE OF COMPLETION', 0, 140, { align: 'center' });

      doc
        .fillColor('#4B5563')
        .fontSize(14)
        .font('Helvetica')
        .text('This is to certify that', 0, 175, { align: 'center' });

      // Student Name
      doc
        .fillColor('#1E40AF')
        .fontSize(30)
        .font('Helvetica-Bold')
        .text(data.studentName, 0, 200, { align: 'center' });

      doc
        .fillColor('#4B5563')
        .fontSize(14)
        .font('Helvetica')
        .text('has successfully completed the training program in', 0, 245, { align: 'center' });

      // Course Name
      doc
        .fillColor('#111827')
        .fontSize(20)
        .font('Helvetica-Bold')
        .text(data.courseName, 0, 270, { align: 'center' });

      // Details section
      const detailsY = 320;
      doc.fillColor('#4B5563').fontSize(12).font('Helvetica');

      doc.text(`Training Centre:`, 100, detailsY, { continued: false });
      doc.fillColor('#111827').font('Helvetica-Bold').text(data.trainingCentre, 220, detailsY);

      doc
        .fillColor('#4B5563')
        .font('Helvetica')
        .text(`Completion Date:`, 100, detailsY + 25, { continued: false });
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text(
          data.completionDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          220,
          detailsY + 25
        );

      doc
        .fillColor('#4B5563')
        .font('Helvetica')
        .text(`Issue Date:`, 100, detailsY + 50, { continued: false });
      doc
        .fillColor('#111827')
        .font('Helvetica-Bold')
        .text(
          data.issueDate.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          }),
          220,
          detailsY + 50
        );

      doc
        .fillColor('#4B5563')
        .font('Helvetica')
        .text(`Certificate No:`, 100, detailsY + 75, { continued: false });
      doc
        .fillColor('#1E40AF')
        .font('Helvetica-Bold')
        .text(data.certificateNumber, 220, detailsY + 75);

      // QR Code
      doc.image(qrBuffer, doc.page.width - 180, 290, { width: 130, height: 130 });
      doc
        .fillColor('#6B7280')
        .fontSize(8)
        .font('Helvetica')
        .text('Scan to verify', doc.page.width - 175, 425, { width: 120, align: 'center' });

      // Footer
      doc
        .moveTo(50, doc.page.height - 80)
        .lineTo(doc.page.width - 50, doc.page.height - 80)
        .strokeColor('#2563EB')
        .lineWidth(1)
        .stroke();

      doc
        .fillColor('#6B7280')
        .fontSize(10)
        .font('Helvetica')
        .text(`Verify at: ${data.verificationUrl}`, 0, doc.page.height - 65, {
          align: 'center',
        });

      doc
        .fillColor('#9CA3AF')
        .fontSize(9)
        .text(
          'This certificate is digitally issued by Pragati Skills Mission. Verify authenticity using the QR code or certificate number.',
          50,
          doc.page.height - 50,
          { align: 'center', width: doc.page.width - 100 }
        );

      doc.end();

      stream.on('finish', () => resolve(filePath));
      stream.on('error', reject);
    } catch (err) {
      reject(err);
    }
  });
}
