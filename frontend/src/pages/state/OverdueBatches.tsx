import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { format, formatDistanceToNow } from 'date-fns';
import { AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function OverdueBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/state/overdue');
      setBatches(res.data.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Overdue Batch Alerts
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Batches pending with officers for more than 24 hours
          </p>
        </div>
        <button onClick={fetchBatches} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>

      {batches.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-800">
            ⚠ {batches.length} batch(es) overdue · Officers need to be followed up
          </p>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <InlineLoader /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Batch Code', 'Course', 'Centre', 'District', 'Candidates', 'Status', 'Submitted', 'Overdue Since', 'Duration'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {batches.length === 0 ? (
                <tr><td colSpan={9}><EmptyState icon={Clock} title="No overdue batches" description="All batches are being processed within the time limit" /></td></tr>
              ) : batches.map(batch => (
                <tr key={batch.id} className="hover:bg-red-50 bg-red-50/30">
                  <td className="px-4 py-3">
                    <Link to={`/batches/${batch.id}`} className="font-mono text-xs text-primary-600 hover:underline">{batch.batchCode}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{batch.courseName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{batch.centre?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{batch.district?.name}</td>
                  <td className="px-4 py-3 text-xs font-medium">{batch.totalCandidates ?? batch._count?.candidates}</td>
                  <td className="px-4 py-3"><Badge status="OVERDUE" /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{batch.submittedAt ? format(new Date(batch.submittedAt), 'dd MMM yy HH:mm') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-red-600 font-medium">{batch.overdueAt ? format(new Date(batch.overdueAt), 'dd MMM yy HH:mm') : '—'}</td>
                  <td className="px-4 py-3 text-xs font-bold text-red-700">
                    {batch.overdueAt ? formatDistanceToNow(new Date(batch.overdueAt), { addSuffix: false }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
