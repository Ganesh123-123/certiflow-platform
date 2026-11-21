import React from 'react';
import { clsx } from 'clsx';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  DISTRICT_REVIEW: 'bg-yellow-100 text-yellow-800',
  DISTRICT_APPROVED: 'bg-teal-100 text-teal-700',
  QUALITY_REVIEW: 'bg-purple-100 text-purple-700',
  QUALITY_APPROVED: 'bg-teal-100 text-teal-700',
  STATE_REVIEW: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
  SENT_BACK: 'bg-amber-100 text-amber-800',
  OVERDUE: 'bg-red-100 text-red-900',
  VALID: 'bg-green-100 text-green-800',
  REVOKED: 'bg-red-100 text-red-700',
  NOT_FOUND: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  GENERATED: 'bg-blue-100 text-blue-700',
  DELIVERED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
};

const statusLabels: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  DISTRICT_REVIEW: 'District Review',
  DISTRICT_APPROVED: 'District Approved',
  QUALITY_REVIEW: 'Quality Review',
  QUALITY_APPROVED: 'Quality Approved',
  STATE_REVIEW: 'State Review',
  APPROVED: '✓ Approved',
  REJECTED: '✗ Rejected',
  SENT_BACK: '↩ Sent Back',
  OVERDUE: '⚠ Overdue',
  VALID: '✓ Valid',
  REVOKED: '✗ Revoked',
  NOT_FOUND: 'Not Found',
  PENDING: 'Pending',
  GENERATED: 'Generated',
  DELIVERED: '✓ Delivered',
  FAILED: 'Failed',
};

export function Badge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
        statusColors[status] ?? 'bg-gray-100 text-gray-700',
        className
      )}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
