-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "districtId" TEXT,
    "centreId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "TrainingCentre" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "District" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TrainingCentre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchCode" TEXT NOT NULL,
    "centreId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "courseName" TEXT NOT NULL,
    "totalCandidates" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" DATETIME,
    "approvedAt" DATETIME,
    "rejectionReason" TEXT,
    "sendBackReason" TEXT,
    "isOverdue" BOOLEAN NOT NULL DEFAULT false,
    "overdueAt" DATETIME,
    "overdueAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Batch_centreId_fkey" FOREIGN KEY ("centreId") REFERENCES "TrainingCentre" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Batch_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Batch_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "dateOfBirth" DATETIME NOT NULL,
    "gender" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "trainingCentre" TEXT NOT NULL,
    "completionDate" DATETIME NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Candidate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Candidate_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "District" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Approval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Approval_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Approval_officerId_fkey" FOREIGN KEY ("officerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QualityReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QualityReview_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QualityReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StateReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "officerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StateReview_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "certificateNumber" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "pdfPath" TEXT,
    "pdfUrl" TEXT,
    "issuedAt" DATETIME,
    "revokedAt" DATETIME,
    "revocationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Certificate_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Certificate_candidateId_fkey" FOREIGN KEY ("candidateId") REFERENCES "Candidate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "certificateId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeliveryAttempt_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "previousState" TEXT,
    "newState" TEXT,
    "reason" TEXT,
    "requestId" TEXT,
    "batchId" TEXT,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityId" TEXT,
    "entityType" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "District_name_key" ON "District"("name");

-- CreateIndex
CREATE UNIQUE INDEX "District_code_key" ON "District"("code");

-- CreateIndex
CREATE INDEX "District_code_idx" ON "District"("code");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCentre_code_key" ON "TrainingCentre"("code");

-- CreateIndex
CREATE INDEX "TrainingCentre_code_idx" ON "TrainingCentre"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_batchCode_key" ON "Batch"("batchCode");

-- CreateIndex
CREATE INDEX "Batch_status_idx" ON "Batch"("status");

-- CreateIndex
CREATE INDEX "Batch_districtId_idx" ON "Batch"("districtId");

-- CreateIndex
CREATE INDEX "Batch_centreId_idx" ON "Batch"("centreId");

-- CreateIndex
CREATE INDEX "Batch_submittedAt_idx" ON "Batch"("submittedAt");

-- CreateIndex
CREATE INDEX "Candidate_batchId_idx" ON "Candidate"("batchId");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_batchId_email_key" ON "Candidate"("batchId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_batchId_mobile_key" ON "Candidate"("batchId", "mobile");

-- CreateIndex
CREATE INDEX "Approval_batchId_idx" ON "Approval"("batchId");

-- CreateIndex
CREATE INDEX "Approval_officerId_idx" ON "Approval"("officerId");

-- CreateIndex
CREATE UNIQUE INDEX "Approval_batchId_officerId_key" ON "Approval"("batchId", "officerId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityReview_batchId_key" ON "QualityReview"("batchId");

-- CreateIndex
CREATE INDEX "QualityReview_batchId_idx" ON "QualityReview"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "StateReview_batchId_key" ON "StateReview"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificateNumber_key" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_candidateId_key" ON "Certificate"("candidateId");

-- CreateIndex
CREATE INDEX "Certificate_certificateNumber_idx" ON "Certificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "Certificate_batchId_idx" ON "Certificate"("batchId");

-- CreateIndex
CREATE INDEX "Certificate_status_idx" ON "Certificate"("status");

-- CreateIndex
CREATE INDEX "DeliveryAttempt_certificateId_idx" ON "DeliveryAttempt"("certificateId");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryAttempt_certificateId_attemptNumber_key" ON "DeliveryAttempt"("certificateId", "attemptNumber");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_batchId_idx" ON "AuditLog"("batchId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_read_idx" ON "Notification"("read");
