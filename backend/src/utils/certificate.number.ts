import { prisma } from '../config/database';

export async function generateCertificateNumber(districtCode: string): Promise<string> {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  const candidateNumber = `PSM-${year}-${districtCode.toUpperCase()}-${random}`;

  const exists = await prisma.certificate.findUnique({
    where: { certificateNumber: candidateNumber },
  });

  if (exists) {
    return generateCertificateNumber(districtCode);
  }

  return candidateNumber;
}
