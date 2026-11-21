import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { format } from 'date-fns';
import { CheckCircle, XCircle, RotateCcw, Eye, RefreshCw, Flag } from 'lucide-react';
import toast from 'react-hot-toast';

type Decision = 'APPROVED' | 'REJECTED' | 'SENT_BACK';

export function StatePendingPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ isOpen: boolean; batch: any | null; decision: Decision | null }>({
    isOpen: false, batch: null, decision: null,
  });
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/state/pending');
      setBatches(res.data.data?.batches ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const submitDecision = async () => {
    if (!modal.batch || !modal.decision) return;
    if ((modal.decision === 'REJECTED' || modal.decision === 'SENT_BACK') && !reason.trim()) {
      toast.error('Reason required');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/state/${modal.batch.id}/decision`, {
        decision: modal.decision,
        reason: reason.trim() || undefined,
      });
      toast.success(modal.decision === 'APPROVED' ? '🎉 Final approval granted! Certificates will be generated.' : `Decision: ${modal.decision}`);
      setModal({ isOpen: false, batch: null, decision: null });
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending State Approval</h1>
          <p className="text-sm text-gray-500 mt-0.5">Final approval triggers automatic certificate generation</p>
        </div>
        <button onClick={fetchBatches} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <InlineLoader /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Batch Code', 'Course', 'Centre', 'District', 'Candidates', 'Quality Review', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={Flag} title="No batches pending state approval" description="Batches that have passed district and quality review will appear here" /></td></tr>
              ) : batches.map(batch => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/batches/${batch.id}`} className="font-mono text-xs text-primary-600 hover:underline">{batch.batchCode}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{batch.courseName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{batch.centre?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{batch.district?.name}</td>
                  <td className="px-4 py-3 text-xs font-bold">{batch.totalCandidates ?? batch._count?.candidates}</td>
                  <td className="px-4 py-3 text-xs">
                    {batch.qualityReview ? (
                      <Badge status={batch.qualityReview.decision} />
                    ) : (
                      <span className="text-gray-400">N/A (&le;50)</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><Badge status={batch.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setModal({ isOpen: true, batch, decision: 'APPROVED' }); setReason(''); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Approve"><CheckCircle className="h-4 w-4" /></button>
                      <button onClick={() => { setModal({ isOpen: true, batch, decision: 'SENT_BACK' }); setReason(''); }} className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg" title="Send Back"><RotateCcw className="h-4 w-4" /></button>
                      <button onClick={() => { setModal({ isOpen: true, batch, decision: 'REJECTED' }); setReason(''); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Reject"><XCircle className="h-4 w-4" /></button>
                      <Link to={`/batches/${batch.id}`} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"><Eye className="h-4 w-4" /></Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={modal.isOpen} onClose={() => setModal({ isOpen: false, batch: null, decision: null })} title={`State ${modal.decision === 'APPROVED' ? 'Approval' : modal.decision}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p className="font-mono font-semibold">{modal.batch?.batchCode}</p>
            <p className="text-gray-500">{modal.batch?.totalCandidates} candidates · {modal.batch?.district?.name}</p>
          </div>
          {modal.decision === 'APPROVED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              🎉 This will trigger <strong>automatic PDF certificate generation</strong> and WhatsApp delivery for all {modal.batch?.totalCandidates} candidates.
            </div>
          )}
          {(modal.decision === 'REJECTED' || modal.decision === 'SENT_BACK') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason *</label>
              <textarea value={reason} onChange={e => setReason(e.target.value)} className="input-field h-24 resize-none" placeholder="State your reason clearly..." autoFocus />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={submitDecision} disabled={submitting} className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${modal.decision === 'APPROVED' ? 'bg-green-600 text-white hover:bg-green-700' : modal.decision === 'REJECTED' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>
              {submitting && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
              {submitting ? 'Processing...' : modal.decision === 'APPROVED' ? 'Grant Final Approval' : modal.decision === 'REJECTED' ? 'Reject Batch' : 'Send Back'}
            </button>
            <button onClick={() => setModal({ isOpen: false, batch: null, decision: null })} className="btn-secondary">Cancel</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
