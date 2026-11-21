import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RotateCcw, Eye, AlertTriangle, RefreshCw, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { Batch } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

type Decision = 'APPROVED' | 'REJECTED' | 'SENT_BACK';

interface ModalState {
  isOpen: boolean;
  batch: Batch | null;
  decision: Decision | null;
}

export function DistrictBatchesPage({ showHistory }: { showHistory?: boolean }) {
  const { user } = useAuth();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ isOpen: false, batch: null, decision: null });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/batches/district');
      setBatches(res.data.data?.batches ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const openDecision = (batch: Batch, decision: Decision) => {
    setModal({ isOpen: true, batch, decision });
    setReason('');
  };

  const submitDecision = async () => {
    if (!modal.batch || !modal.decision) return;
    if ((modal.decision === 'REJECTED' || modal.decision === 'SENT_BACK') && !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/approvals/${modal.batch.id}`, {
        decision: modal.decision,
        reason: reason.trim() || undefined,
      });
      const labels: Record<Decision, string> = {
        APPROVED: '✓ Approved successfully',
        REJECTED: 'Batch rejected',
        SENT_BACK: 'Batch sent back for correction',
      };
      toast.success(labels[modal.decision]);
      setModal({ isOpen: false, batch: null, decision: null });
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to submit decision');
    } finally {
      setSubmitting(false);
    }
  };

  const hasAlreadyDecided = (batch: Batch) =>
    batch.approvals?.some((a) => a.officer.id === user?.id);

  const myDecision = (batch: Batch) =>
    batch.approvals?.find((a) => a.officer.id === user?.id);

  const approvedCount = (batch: Batch) =>
    batch.approvals?.filter((a) => a.decision === 'APPROVED').length ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showHistory ? 'Review History' : 'Batches Pending Review'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            District: <strong>{user?.district?.name}</strong> · Each batch requires{' '}
            <strong>2 distinct officer approvals</strong>
          </p>
        </div>
        <button onClick={fetchBatches} className="btn-secondary p-2" title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <InlineLoader />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Batch Code', 'Course', 'Centre', 'Candidates', 'Approvals', 'Status', 'Submitted', 'Actions'].map(
                  (h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <EmptyState
                      icon={CheckSquare}
                      title="No batches pending review"
                      description="New batches submitted to your district will appear here"
                    />
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const decided = hasAlreadyDecided(batch);
                  const myDec = myDecision(batch);
                  return (
                    <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link
                          to={`/batches/${batch.id}`}
                          className="font-mono text-xs text-primary-600 hover:underline"
                        >
                          {batch.batchCode}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 text-xs max-w-32 truncate">
                        {batch.courseName}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{batch.centre?.name}</td>
                      <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                        {batch.totalCandidates}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Approval dots */}
                          {[0, 1].map((i) => {
                            const approval = batch.approvals?.[i];
                            return (
                              <span
                                key={i}
                                title={approval ? `${approval.officer.name}: ${approval.decision}` : 'Pending'}
                                className={`inline-block h-2.5 w-2.5 rounded-full ${
                                  approval?.decision === 'APPROVED'
                                    ? 'bg-green-500'
                                    : approval?.decision === 'REJECTED'
                                    ? 'bg-red-500'
                                    : approval?.decision === 'SENT_BACK'
                                    ? 'bg-yellow-500'
                                    : 'bg-gray-200'
                                }`}
                              />
                            );
                          })}
                          <span className="text-xs text-gray-400 ml-1">
                            {approvedCount(batch)}/2
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Badge status={batch.status} />
                          {batch.isOverdue && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {batch.submittedAt
                          ? format(new Date(batch.submittedAt), 'dd MMM yy HH:mm')
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {decided ? (
                          <span
                            className={`text-xs font-medium flex items-center gap-1 ${
                              myDec?.decision === 'APPROVED'
                                ? 'text-green-600'
                                : myDec?.decision === 'REJECTED'
                                ? 'text-red-600'
                                : 'text-yellow-600'
                            }`}
                          >
                            <CheckCircle className="h-3 w-3" />
                            {myDec?.decision === 'APPROVED'
                              ? 'You approved'
                              : myDec?.decision === 'REJECTED'
                              ? 'You rejected'
                              : 'You sent back'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openDecision(batch, 'APPROVED')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDecision(batch, 'SENT_BACK')}
                              className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Send Back"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDecision(batch, 'REJECTED')}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                            <Link
                              to={`/batches/${batch.id}`}
                              className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, batch: null, decision: null })}
        title={
          modal.decision === 'APPROVED'
            ? '✓ Approve Batch'
            : modal.decision === 'REJECTED'
            ? '✗ Reject Batch'
            : '↩ Send Back for Correction'
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="text-gray-500">Batch</p>
            <p className="font-semibold font-mono">{modal.batch?.batchCode}</p>
            <p className="text-gray-500 mt-1">Course: {modal.batch?.courseName}</p>
          </div>

          {(modal.decision === 'REJECTED' || modal.decision === 'SENT_BACK') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reason <span className="text-red-500">*</span>
                {modal.decision === 'SENT_BACK' && (
                  <span className="text-gray-400 font-normal ml-1">
                    (will be shown to training centre)
                  </span>
                )}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field h-28 resize-none"
                placeholder="Provide a clear, actionable reason..."
                autoFocus
              />
            </div>
          )}

          {modal.decision === 'APPROVED' && (
            <p className="text-sm text-gray-600 bg-green-50 border border-green-200 rounded-lg p-3">
              Your approval will be recorded. The batch moves forward once{' '}
              <strong>2 distinct officers</strong> from {user?.district?.name} have approved.
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={submitDecision}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors ${
                modal.decision === 'APPROVED'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : modal.decision === 'REJECTED'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {submitting && (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              )}
              {submitting
                ? 'Submitting...'
                : modal.decision === 'APPROVED'
                ? 'Confirm Approval'
                : modal.decision === 'REJECTED'
                ? 'Confirm Rejection'
                : 'Send Back'}
            </button>
            <button
              onClick={() => setModal({ isOpen: false, batch: null, decision: null })}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
