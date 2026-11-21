import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CertiFlow database...\n');

  const districts = await Promise.all([
    prisma.district.upsert({ where: { name: 'Pune' }, update: {}, create: { name: 'Pune', code: 'PUN' } }),
    prisma.district.upsert({ where: { name: 'Mumbai' }, update: {}, create: { name: 'Mumbai', code: 'MUM' } }),
    prisma.district.upsert({ where: { name: 'Nagpur' }, update: {}, create: { name: 'Nagpur', code: 'NGP' } }),
    prisma.district.upsert({ where: { name: 'Nashik' }, update: {}, create: { name: 'Nashik', code: 'NSK' } }),
  ]);
  console.log('✅ Districts seeded:', districts.map((d) => d.name).join(', '));

  const centres = await Promise.all([
    prisma.trainingCentre.upsert({
      where: { code: 'PSH-PUN-001' }, update: {},
      create: { name: 'Pragati Skill Hub Pune', code: 'PSH-PUN-001', address: 'Survey No. 42, Kothrud, Pune - 411038, Maharashtra' },
    }),
    prisma.trainingCentre.upsert({
      where: { code: 'ETM-MUM-001' }, update: {},
      create: { name: 'Excellence Training Mumbai', code: 'ETM-MUM-001', address: 'Plot 7, Andheri East, Mumbai - 400069, Maharashtra' },
    }),
  ]);
  console.log('✅ Training Centres seeded:', centres.map((c) => c.name).join(', '));

  const passwordHash = await bcrypt.hash('Demo@1234', 10);
  const [pune, mumbai] = districts;

  await prisma.user.upsert({ where: { email: 'anika@certiflow.gov.in' }, update: {}, create: { name: 'Anika Sharma', email: 'anika@certiflow.gov.in', passwordHash, role: 'TRAINING_CENTRE', centreId: centres[0].id } });
  await prisma.user.upsert({ where: { email: 'dev@certiflow.gov.in' }, update: {}, create: { name: 'Dev Patel', email: 'dev@certiflow.gov.in', passwordHash, role: 'DISTRICT_OFFICER', districtId: pune.id } });
  await prisma.user.upsert({ where: { email: 'meera@certiflow.gov.in' }, update: {}, create: { name: 'Meera Joshi', email: 'meera@certiflow.gov.in', passwordHash, role: 'DISTRICT_OFFICER', districtId: pune.id } });
  await prisma.user.upsert({ where: { email: 'kabir@certiflow.gov.in' }, update: {}, create: { name: 'Kabir Khan', email: 'kabir@certiflow.gov.in', passwordHash, role: 'DISTRICT_OFFICER', districtId: mumbai.id } });
  await prisma.user.upsert({ where: { email: 'neha@certiflow.gov.in' }, update: {}, create: { name: 'Neha Singh', email: 'neha@certiflow.gov.in', passwordHash, role: 'QUALITY_TEAM' } });
  await prisma.user.upsert({ where: { email: 'farah@certiflow.gov.in' }, update: {}, create: { name: 'Farah Ahmed', email: 'farah@certiflow.gov.in', passwordHash, role: 'STATE_OFFICER' } });

  console.log('✅ Users seeded (6 demo accounts)');
  console.log('\n🎉 Database seeding complete!\n');
  console.log('Demo Credentials (password: Demo@1234):');
  console.log('  anika@certiflow.gov.in  → Training Centre');
  console.log('  dev@certiflow.gov.in    → District Officer (Pune)');
  console.log('  meera@certiflow.gov.in  → District Officer (Pune)');
  console.log('  kabir@certiflow.gov.in  → District Officer (Mumbai)');
  console.log('  neha@certiflow.gov.in   → Quality Team');
  console.log('  farah@certiflow.gov.in  → State Officer\n');
}

main().catch((e) => { console.error('Seed failed:', e); process.exit(1); }).finally(() => prisma.$disconnect());
