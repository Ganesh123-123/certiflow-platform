export type Role = 'TRAINING_CENTRE' | 'DISTRICT_OFFICER' | 'QUALITY_TEAM' | 'STATE_OFFICER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  district?: { id: string; name: string; code: string } | null;
  centre?: { id: string; name: string; code: string } | null;
}

export type BatchStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'DISTRICT_REVIEW'
  | 'DISTRICT_APPROVED'
  | 'QUALITY_REVIEW'
  | 'QUALITY_APPROVED'
  | 'STATE_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT_BACK'
  | 'OVERDUE';

export interface Batch {
  id: string;
  batchCode: string;
  courseName: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  totalCandidates: number;
  submittedAt?: string;
  approvedAt?: string;
  isOverdue: boolean;
  rejectionReason?: string;
  sendBackReason?: string;
  centre: { id: string; name: string; code: string };
  district: { id: string; name: string; code: string };
  submittedBy?: { id: string; name: string; email: string };
  approvals?: Approval[];
  qualityReview?: QualityReview | null;
  _count?: { candidates: number; certificates: number };
}

export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  dateOfBirth: string;
  gender: string;
  courseName: string;
  trainingCentre: string;
  completionDate: string;
  rowNumber: number;
}

export interface Approval {
  id: string;
  decision: 'APPROVED' | 'REJECTED' | 'SENT_BACK';
  reason?: string;
  createdAt: string;
  officer: { id: string; name: string; role?: string };
}

export interface QualityReview {
  id: string;
  decision: 'APPROVED' | 'REJECTED' | 'SENT_BACK';
  reason?: string;
  createdAt: string;
  reviewer: { id: string; name: string };
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  status: 'PENDING' | 'GENERATED' | 'DELIVERED' | 'REVOKED' | 'FAILED';
  pdfUrl?: string;
  issuedAt?: string;
  candidate: { fullName: string; email: string; mobile: string };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  entityId?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: string;
  newState?: string;
  reason?: string;
  createdAt: string;
  user: { name: string; role: string };
}
