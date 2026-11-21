import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, RefreshCw } from 'lucide-react';
import api from '../../lib/api';
import { Batch } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { format } from 'date-fns';

export function BatchListPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/batches/my');
      setBatches(res.data.data?.batches ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const filtered = batches.filter(
    (b) =>
      b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
      b.courseName.toLowerCase().includes(search.toLowerCase()) ||
      b.district?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track your training batches</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBatches} className="btn-secondary p-2" title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link to="/batches/new" className="btn-primary flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Batch
          </Link>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-9"
          placeholder="Search batches..."
        />
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <InlineLoader />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Batch Code', 'Course', 'District', 'Candidates', 'Status', 'Created', 'Actions'].map(
                  (h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      title="No batches found"
                      description="Create your first batch to get started"
                      action={
                        <Link to="/batches/new" className="btn-primary inline-flex items-center gap-2 mt-2">
                          <Plus className="h-4 w-4" /> New Batch
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((batch) => (
                  <tr key={batch.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        to={`/batches/${batch.id}`}
                        className="font-mono text-xs text-primary-600 hover:text-primary-700 hover:underline"
                      >
                        {batch.batchCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs">{batch.courseName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{batch.district?.name}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">
                      {batch.totalCandidates}
                    </td>
                    <td className="px-4 py-3">
                      <Badge status={batch.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {batch.submittedAt
                        ? format(new Date(batch.submittedAt), 'dd MMM yy')
                        : format(new Date(), 'dd MMM yy')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/batches/${batch.id}`}
                        className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Send back notice */}
      {batches.some((b) => b.status === 'SENT_BACK') && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm font-medium text-amber-800">
            ⚠ You have {batches.filter((b) => b.status === 'SENT_BACK').length} batch(es) sent
            back for correction. Click the batch to view the reason and resubmit.
          </p>
        </div>
      )}
    </div>
  );
}
