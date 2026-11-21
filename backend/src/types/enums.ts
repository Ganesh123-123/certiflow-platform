// Enum constants replacing @prisma/client enums (which don't exist in SQLite schema)
export const Role = {
  TRAINING_CENTRE: 'TRAINING_CENTRE',
  DISTRICT_OFFICER: 'DISTRICT_OFFICER',
  QUALITY_TEAM: 'QUALITY_TEAM',
  STATE_OFFICER: 'STATE_OFFICER',
} as const;
export type Role = typeof Role[keyof typeof Role];

export const BatchStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  DISTRICT_REVIEW: 'DISTRICT_REVIEW',
  DISTRICT_APPROVED: 'DISTRICT_APPROVED',
  QUALITY_REVIEW: 'QUALITY_REVIEW',
  QUALITY_APPROVED: 'QUALITY_APPROVED',
  STATE_REVIEW: 'STATE_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENT_BACK: 'SENT_BACK',
  OVERDUE: 'OVERDUE',
} as const;
export type BatchStatus = typeof BatchStatus[keyof typeof BatchStatus];

export const ApprovalDecision = {
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  SENT_BACK: 'SENT_BACK',
} as const;
export type ApprovalDecision = typeof ApprovalDecision[keyof typeof ApprovalDecision];

export const CertificateStatus = {
  PENDING: 'PENDING',
  GENERATED: 'GENERATED',
  DELIVERED: 'DELIVERED',
  REVOKED: 'REVOKED',
  FAILED: 'FAILED',
} as const;
export type CertificateStatus = typeof CertificateStatus[keyof typeof CertificateStatus];
