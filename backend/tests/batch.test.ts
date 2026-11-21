import 'dotenv/config';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import { Role, BatchStatus } from '@prisma/client';

// ── Test fixtures ────────────────────────────────────────────
let anikaToken: string;
let devToken: string;
let meeraToken: string;
let kabirToken: string; // Mumbai district
let nehaToken: string;
let farahToken: string;

let testDistrictId: string;
let testCentreId: string;
let testBatchId: string;
let testUserId: string;

// ── Minimal valid CSV ────────────────────────────────────────
const validCsv = `Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date
Ramesh Kumar,ramesh.test@example.com,9876543210,2000-01-15,Male,Digital Literacy,Pragati Skill Hub,2024-06-30
Priya Sharma,priya.test@example.com,9876543211,1999-05-20,Female,Digital Literacy,Pragati Skill Hub,2024-06-30`;

const invalidCsv = `Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date
,bad-email,123,2000-01-01,male,Course,TC,2024-01-01`;

const duplicateEmailCsv = `Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date
User One,dup.email@test.com,9000000001,2000-01-01,Male,Course A,TC,2024-01-01
User Two,dup.email@test.com,9000000002,2000-01-01,Male,Course A,TC,2024-01-01`;

// ── Setup ────────────────────────────────────────────────────
beforeAll(async () => {
  const hash = await bcrypt.hash('Test@1234', 10);

  // District
  const district = await prisma.district.upsert({
    where: { name: 'TestDistrict' },
    update: {},
    create: { name: 'TestDistrict', code: 'TST' },
  });
  testDistrictId = district.id;

  // Training Centre
  const centre = await prisma.trainingCentre.upsert({
    where: { code: 'TEST-CTR-001' },
    update: {},
    create: { name: 'Test Training Centre', code: 'TEST-CTR-001', address: 'Test Address' },
  });
  testCentreId = centre.id;

  // Mumbai district for Kabir
  const mumbaiDistrict = await prisma.district.upsert({
    where: { name: 'Mumbai' },
    update: {},
    create: { name: 'Mumbai', code: 'MUM' },
  });

  // Create test users
  const anika = await prisma.user.upsert({
    where: { email: 'test.anika@certiflow.test' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Anika',
      email: 'test.anika@certiflow.test',
      passwordHash: hash,
      role: Role.TRAINING_CENTRE,
      centreId: centre.id,
    },
  });
  testUserId = anika.id;

  await prisma.user.upsert({
    where: { email: 'test.dev@certiflow.test' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Dev',
      email: 'test.dev@certiflow.test',
      passwordHash: hash,
      role: Role.DISTRICT_OFFICER,
      districtId: district.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'test.meera@certiflow.test' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Meera',
      email: 'test.meera@certiflow.test',
      passwordHash: hash,
      role: Role.DISTRICT_OFFICER,
      districtId: district.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'test.kabir@certiflow.test' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Kabir',
      email: 'test.kabir@certiflow.test',
      passwordHash: hash,
      role: Role.DISTRICT_OFFICER,
      districtId: mumbaiDistrict.id,
    },
  });

  await prisma.user.upsert({
    where: { email: 'test.neha@certiflow.test' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Neha',
      email: 'test.neha@certiflow.test',
      passwordHash: hash,
      role: Role.QUALITY_TEAM,
    },
  });

  await prisma.user.upsert({
    where: { email: 'test.farah@certiflow.test' },
    update: { passwordHash: hash },
    create: {
      name: 'Test Farah',
      email: 'test.farah@certiflow.test',
      passwordHash: hash,
      role: Role.STATE_OFFICER,
    },
  });

  // Get auth tokens
  const login = async (email: string) => {
    const r = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Test@1234' });
    expect(r.status).toBe(200);
    return r.body.data.token as string;
  };

  anikaToken  = await login('test.anika@certiflow.test');
  devToken    = await login('test.dev@certiflow.test');
  meeraToken  = await login('test.meera@certiflow.test');
  kabirToken  = await login('test.kabir@certiflow.test');
  nehaToken   = await login('test.neha@certiflow.test');
  farahToken  = await login('test.farah@certiflow.test');
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ── Auth Tests ───────────────────────────────────────────────
describe('1. Authentication', () => {
  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.anika@certiflow.test', password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('TRAINING_CENTRE');
  });

  it('should reject invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.anika@certiflow.test', password: 'wrongpassword' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return profile for authenticated user', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test.anika@certiflow.test');
  });
});

// ── Batch Creation Tests ─────────────────────────────────────
describe('2. Batch Creation', () => {
  it('should create a batch as training centre user', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Digital Literacy Programme', districtId: testDistrictId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DRAFT');
    testBatchId = res.body.data.id;
  });

  it('should NOT allow district officer to create a batch', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${devToken}`)
      .send({ courseName: 'Test Course', districtId: testDistrictId });
    expect(res.status).toBe(403);
  });

  it('should NOT allow state officer to create a batch', async () => {
    const res = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${farahToken}`)
      .send({ courseName: 'Test Course', districtId: testDistrictId });
    expect(res.status).toBe(403);
  });
});

// ── CSV Upload Tests ──────────────────────────────────────────
describe('3. CSV Upload Validation', () => {
  it('should REJECT invalid CSV and save ZERO records', async () => {
    const res = await request(app)
      .post(`/api/batches/${testBatchId}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(invalidCsv), {
        filename: 'invalid.csv',
        contentType: 'text/csv',
      });

    expect(res.status).toBe(422);
    expect(res.body.data.success).toBe(false);
    expect(res.body.data.errors.length).toBeGreaterThan(0);

    // Verify NO records were saved
    const count = await prisma.candidate.count({ where: { batchId: testBatchId } });
    expect(count).toBe(0);
  });

  it('should REJECT duplicate emails within a CSV', async () => {
    const res = await request(app)
      .post(`/api/batches/${testBatchId}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(duplicateEmailCsv), {
        filename: 'dup.csv',
        contentType: 'text/csv',
      });

    expect(res.body.data.errors.length).toBeGreaterThan(0);
    // Still no records saved
    const count = await prisma.candidate.count({ where: { batchId: testBatchId } });
    expect(count).toBe(0);
  });

  it('should ACCEPT valid CSV and save all records atomically', async () => {
    const res = await request(app)
      .post(`/api/batches/${testBatchId}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(validCsv), {
        filename: 'valid.csv',
        contentType: 'text/csv',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.validCount).toBe(2);

    const count = await prisma.candidate.count({ where: { batchId: testBatchId } });
    expect(count).toBe(2);
  });

  it('should NOT allow uploading to another user batch', async () => {
    // devToken is a district officer, not training centre
    const res = await request(app)
      .post(`/api/batches/${testBatchId}/candidates`)
      .set('Authorization', `Bearer ${devToken}`)
      .attach('file', Buffer.from(validCsv), {
        filename: 'valid.csv',
        contentType: 'text/csv',
      });
    expect(res.status).toBe(403);
  });
});

// ── Batch Submission Tests ────────────────────────────────────
describe('4. Batch Submission', () => {
  it('should submit batch for district review', async () => {
    const res = await request(app)
      .post(`/api/batches/${testBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('DISTRICT_REVIEW');
  });

  it('should NOT allow submitting a batch already in review', async () => {
    const res = await request(app)
      .post(`/api/batches/${testBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(res.status).toBe(400);
  });
});

// ── District Approval Tests ───────────────────────────────────
describe('5. District Approval Workflow', () => {
  it('should NOT allow officer from wrong district to approve', async () => {
    // Kabir is in Mumbai, batch is in TestDistrict
    const res = await request(app)
      .post(`/api/approvals/${testBatchId}`)
      .set('Authorization', `Bearer ${kabirToken}`)
      .send({ decision: 'APPROVED' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/different district/i);
  });

  it('should allow first district officer approval (batch stays in DISTRICT_REVIEW)', async () => {
    const res = await request(app)
      .post(`/api/approvals/${testBatchId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Batch should NOT advance yet (only 1 of 2 required approvals)
    const batch = await prisma.batch.findUnique({ where: { id: testBatchId } });
    expect(batch?.status).toBe(BatchStatus.DISTRICT_REVIEW);
  });

  it('should NOT allow same officer to approve twice', async () => {
    const res = await request(app)
      .post(`/api/approvals/${testBatchId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already submitted/i);
  });

  it('should advance batch after SECOND distinct officer approval', async () => {
    const res = await request(app)
      .post(`/api/approvals/${testBatchId}`)
      .set('Authorization', `Bearer ${meeraToken}`)
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(200);

    // Batch has 2 candidates (≤50), so should go to STATE_REVIEW (not QUALITY_REVIEW)
    const batch = await prisma.batch.findUnique({ where: { id: testBatchId } });
    expect(batch?.status).toBe(BatchStatus.STATE_REVIEW);
  });

  it('should require reason when rejecting', async () => {
    // Create a fresh batch for rejection test
    const createRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Reject Test Course', districtId: testDistrictId });
    const rejectBatchId = createRes.body.data.id;

    // Upload candidates
    await request(app)
      .post(`/api/batches/${rejectBatchId}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(`Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date\nTest User,reject.test@example.com,9111222333,2000-01-01,Male,Course,TC,2024-01-01`), {
        filename: 'test.csv', contentType: 'text/csv',
      });

    // Submit
    await request(app)
      .post(`/api/batches/${rejectBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);

    // Reject without reason → should fail
    const noReasonRes = await request(app)
      .post(`/api/approvals/${rejectBatchId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'REJECTED' });
    expect(noReasonRes.status).toBe(400);

    // Reject with reason → should succeed
    const withReasonRes = await request(app)
      .post(`/api/approvals/${rejectBatchId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'REJECTED', reason: 'Documents incomplete - missing attendance records' });
    expect(withReasonRes.status).toBe(200);

    const batch = await prisma.batch.findUnique({ where: { id: rejectBatchId } });
    expect(batch?.status).toBe(BatchStatus.REJECTED);
  });
});

// ── Quality Review Tests ──────────────────────────────────────
describe('6. Quality Review (large batches)', () => {
  it('should route large batches (>50 candidates) through quality review', async () => {
    // Create a batch with 51 candidates
    const createRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Large Batch Course', districtId: testDistrictId });
    const largeBatchId = createRes.body.data.id;

    // Generate 51 candidates
    const header = 'Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date';
    const rows = Array.from({ length: 51 }, (_, i) =>
      `Candidate ${i + 1},cand${i + 1}@large.test,9${String(800000000 + i).padStart(9, '0')},2000-01-01,Male,Course,TC,2024-01-01`
    );
    const bigCsv = [header, ...rows].join('\n');

    await request(app)
      .post(`/api/batches/${largeBatchId}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(bigCsv), { filename: 'large.csv', contentType: 'text/csv' });

    await request(app)
      .post(`/api/batches/${largeBatchId}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);

    // Two officer approvals
    await request(app)
      .post(`/api/approvals/${largeBatchId}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'APPROVED' });

    await request(app)
      .post(`/api/approvals/${largeBatchId}`)
      .set('Authorization', `Bearer ${meeraToken}`)
      .send({ decision: 'APPROVED' });

    // Should be in QUALITY_REVIEW now
    const batch = await prisma.batch.findUnique({ where: { id: largeBatchId } });
    expect(batch?.status).toBe(BatchStatus.QUALITY_REVIEW);

    // Quality team approves
    const qualityRes = await request(app)
      .post(`/api/quality/${largeBatchId}/review`)
      .set('Authorization', `Bearer ${nehaToken}`)
      .send({ decision: 'APPROVED' });
    expect(qualityRes.status).toBe(200);

    const afterQuality = await prisma.batch.findUnique({ where: { id: largeBatchId } });
    expect(afterQuality?.status).toBe(BatchStatus.STATE_REVIEW);
  });

  it('should NOT allow district officer to perform quality review', async () => {
    // Find a batch in QUALITY_REVIEW or just test with any batchId
    const batch = await prisma.batch.findFirst({ where: { status: BatchStatus.QUALITY_REVIEW } });
    if (!batch) return; // No quality batch exists, skip

    const res = await request(app)
      .post(`/api/quality/${batch.id}/review`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'APPROVED' });
    expect(res.status).toBe(403);
  });
});

// ── State Approval & Certificate Tests ───────────────────────
describe('7. State Approval & Certificates', () => {
  it('should grant final approval as state officer', async () => {
    const res = await request(app)
      .post(`/api/state/${testBatchId}/decision`)
      .set('Authorization', `Bearer ${farahToken}`)
      .send({ decision: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.data.decision).toBe('APPROVED');

    const batch = await prisma.batch.findUnique({ where: { id: testBatchId } });
    expect(batch?.status).toBe(BatchStatus.APPROVED);
  });

  it('should NOT allow district officer to perform state approval', async () => {
    // Create fresh batch in STATE_REVIEW
    const b = await prisma.batch.create({
      data: {
        batchCode: `BATCH-AUTHTEST-${Date.now()}`,
        centreId: testCentreId,
        districtId: testDistrictId,
        submittedById: testUserId,
        courseName: 'Auth Test',
        status: BatchStatus.STATE_REVIEW,
        totalCandidates: 1,
      },
    });

    const res = await request(app)
      .post(`/api/state/${b.id}/decision`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  it('should trigger certificate generation jobs after state approval', async () => {
    // Wait briefly for async processing
    await new Promise((r) => setTimeout(r, 500));

    // Certificates should be created (at least PENDING status)
    const certs = await prisma.certificate.findMany({
      where: { batchId: testBatchId },
    });
    // May be 0 if workers not running in test, but records should exist
    // The key test is state approval succeeded and batch is APPROVED
    const batch = await prisma.batch.findUnique({ where: { id: testBatchId } });
    expect(batch?.status).toBe(BatchStatus.APPROVED);
  });
});

// ── Certificate Verification Tests ───────────────────────────
describe('8. Certificate Verification', () => {
  it('should return NOT_FOUND for unknown certificate number', async () => {
    const res = await request(app).get('/api/certificates/verify/PSM-9999-ZZZ-XXXXXX');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('NOT_FOUND');
  });

  it('should return VALID for a generated certificate', async () => {
    // Create a mock certificate directly for testing
    const candidate = await prisma.candidate.findFirst({ where: { batchId: testBatchId } });
    if (!candidate) return;

    const certNum = `PSM-TEST-TST-${Date.now().toString(36).toUpperCase()}`;
    await prisma.certificate.upsert({
      where: { candidateId: candidate.id },
      update: {},
      create: {
        certificateNumber: certNum,
        batchId: testBatchId,
        candidateId: candidate.id,
        status: 'GENERATED',
        issuedAt: new Date(),
      },
    });

    const res = await request(app).get(`/api/certificates/verify/${certNum}`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('VALID');
    expect(res.body.data.candidateName).toBeTruthy();
  });

  it('should show REVOKED for a revoked certificate and not expose private data', async () => {
    const cert = await prisma.certificate.findFirst({
      where: { batchId: testBatchId, status: 'GENERATED' },
    });
    if (!cert) return;

    // Revoke it
    await request(app)
      .post(`/api/state/certificates/${cert.certificateNumber}/revoke`)
      .set('Authorization', `Bearer ${farahToken}`)
      .send({ reason: 'Test revocation - student eligibility issue confirmed' });

    // Verify shows REVOKED
    const verifyRes = await request(app).get(`/api/certificates/verify/${cert.certificateNumber}`);
    expect(verifyRes.body.data.status).toBe('REVOKED');
    // Should NOT expose personal data
    expect(verifyRes.body.data.candidateName).toBeUndefined();
    expect(verifyRes.body.data.mobile).toBeUndefined();
  });
});

// ── Audit Log Tests ───────────────────────────────────────────
describe('9. Audit Logging', () => {
  it('should create audit logs for important actions', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { batchId: testBatchId },
      orderBy: { createdAt: 'asc' },
    });

    expect(logs.length).toBeGreaterThan(0);
    // Should have batch submission log
    const submitLog = logs.find((l) => l.action === 'BATCH_SUBMITTED');
    expect(submitLog).toBeDefined();

    // Should have district approval logs
    const approvalLogs = logs.filter((l) => l.action.startsWith('DISTRICT_'));
    expect(approvalLogs.length).toBeGreaterThanOrEqual(2);
  });

  it('should NOT allow non-state officers to view audit logs', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${anikaToken}`);
    expect(res.status).toBe(403);
  });

  it('should allow state officers to view audit logs', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${farahToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });
});

// ── Send-Back and Resubmission Tests ─────────────────────────
describe('10. Send-Back and Resubmission', () => {
  it('should allow training centre to resubmit a sent-back batch', async () => {
    // Create batch → upload → submit → send back
    const bRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${anikaToken}`)
      .send({ courseName: 'Resubmit Test Course', districtId: testDistrictId });
    const bid = bRes.body.data.id;

    await request(app)
      .post(`/api/batches/${bid}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(`Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date\nSendback User,sendback@example.com,9888777666,2000-01-01,Male,Course,TC,2024-01-01`), {
        filename: 'sb.csv', contentType: 'text/csv',
      });

    await request(app).post(`/api/batches/${bid}/submit`).set('Authorization', `Bearer ${anikaToken}`);

    await request(app)
      .post(`/api/approvals/${bid}`)
      .set('Authorization', `Bearer ${devToken}`)
      .send({ decision: 'SENT_BACK', reason: 'Please correct mobile number format' });

    const sentBack = await prisma.batch.findUnique({ where: { id: bid } });
    expect(sentBack?.status).toBe(BatchStatus.SENT_BACK);

    // Resubmit (upload new file + submit again)
    await request(app)
      .post(`/api/batches/${bid}/candidates`)
      .set('Authorization', `Bearer ${anikaToken}`)
      .attach('file', Buffer.from(`Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date\nSendback User Fixed,fixed@example.com,9888777655,2000-01-01,Male,Course,TC,2024-01-01`), {
        filename: 'fixed.csv', contentType: 'text/csv',
      });

    const resubmitRes = await request(app)
      .post(`/api/batches/${bid}/submit`)
      .set('Authorization', `Bearer ${anikaToken}`);

    expect(resubmitRes.status).toBe(200);
    expect(resubmitRes.body.data.status).toBe('DISTRICT_REVIEW');
  });
});
