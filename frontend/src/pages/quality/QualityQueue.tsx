import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RotateCcw, Eye, RefreshCw, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { Batch } from '../../types';

type Decision = 'APPROVED' | 'REJECTED' | 'SENT_BACK';

export function QualityQueuePage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ isOpen: boolean; batch: Batch | null; decision: Decision | null }>({
    isOpen: false, batch: null, decision: null,
  });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/quality/pending');
      setBatches(res.data.data?.batches ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const submitReview = async () => {
    if (!modal.batch || !modal.decision) return;
    if ((modal.decision === 'REJECTED' || modal.decision === 'SENT_BACK') && !reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/quality/${modal.batch.id}/review`, {
        decision: modal.decision,
        reason: reason.trim() || undefined,
      });
      toast.success(`Quality review submitted: ${modal.decision}`);
      setModal({ isOpen: false, batch: null, decision: null });
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Review submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quality Review Queue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Batches with more than 50 candidates require quality review before state approval
          </p>
        </div>
        <button onClick={fetchBatches} className="btn-secondary p-2">
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
                {['Batch Code', 'Course', 'Centre', 'District', 'Candidates', 'Status', 'Submitted', 'Actions'].map(
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
                      icon={Shield}
                      title="Quality queue is empty"
                      description="Large batches (>50 candidates) pending quality review will appear here"
                    />
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/batches/${batch.id}`} className="font-mono text-xs text-primary-600 hover:underline">
                        {batch.batchCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs">{batch.courseName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{batch.centre?.name}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{batch.district?.name}</td>
                    <td className="px-4 py-3 text-xs font-bold text-purple-600">
                      {batch.totalCandidates}
                    </td>
                    <td className="px-4 py-3"><Badge status={batch.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {batch.submittedAt ? format(new Date(batch.submittedAt), 'dd MMM yy') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => { setModal({ isOpen: true, batch, decision: 'APPROVED' }); setReason(''); }}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setModal({ isOpen: true, batch, decision: 'SENT_BACK' }); setReason(''); }}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Send Back"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setModal({ isOpen: true, batch, decision: 'REJECTED' }); setReason(''); }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                        <Link to={`/batches/${batch.id}`} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg">
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal({ isOpen: false, batch: null, decision: null })}
        title={`Quality Review – ${modal.decision === 'APPROVED' ? 'Approve' : modal.decision === 'REJECTED' ? 'Reject' : 'Send Back'}`}
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-mono font-semibold">{modal.batch?.batchCode}</p>
            <p className="text-gray-500">{modal.batch?.totalCandidates} candidates · {modal.batch?.district?.name}</p>
          </div>
          {(modal.decision === 'REJECTED' || modal.decision === 'SENT_BACK') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field h-24 resize-none"
                placeholder="Provide quality review feedback..."
                autoFocus
              />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              onClick={submitReview}
              disabled={submitting}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${
                modal.decision === 'APPROVED' ? 'bg-green-600 text-white hover:bg-green-700' :
                modal.decision === 'REJECTED' ? 'bg-red-600 text-white hover:bg-red-700' :
                'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              {submitting && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              {submitting ? 'Submitting...' : 'Confirm Review'}
            </button>
            <button onClick={() => setModal({ isOpen: false, batch: null, decision: null })} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
