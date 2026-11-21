import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { Badge } from '../../components/ui/Badge';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { Search, RefreshCw, FileText } from 'lucide-react';

export function StateAllBatchesPage() {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const res = await api.get(`/state/all-batches${params}`);
      setBatches(res.data.data?.batches ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, [statusFilter]);

  const filtered = batches.filter(b =>
    b.batchCode.toLowerCase().includes(search.toLowerCase()) ||
    b.courseName.toLowerCase().includes(search.toLowerCase()) ||
    b.district?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const statuses = ['', 'DRAFT', 'DISTRICT_REVIEW', 'QUALITY_REVIEW', 'STATE_REVIEW', 'APPROVED', 'REJECTED', 'SENT_BACK', 'OVERDUE'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Batches</h1>
          <p className="text-sm text-gray-500 mt-0.5">System-wide view of all training batches</p>
        </div>
        <button onClick={fetchBatches} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-9" placeholder="Search batches..." />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field w-48">
          {statuses.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? <InlineLoader /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Batch Code', 'Course', 'Centre', 'District', 'Candidates', 'Status', 'Submitted', 'Approved'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8}><EmptyState icon={FileText} title="No batches found" /></td></tr>
              ) : filtered.map(batch => (
                <tr key={batch.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/batches/${batch.id}`} className="font-mono text-xs text-primary-600 hover:underline">{batch.batchCode}</Link>
                  </td>
                  <td className="px-4 py-3 text-xs">{batch.courseName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{batch.centre?.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{batch.district?.name}</td>
                  <td className="px-4 py-3 text-xs font-medium">{batch.totalCandidates ?? batch._count?.candidates}</td>
                  <td className="px-4 py-3"><Badge status={batch.status} /></td>
                  <td className="px-4 py-3 text-xs text-gray-400">{batch.submittedAt ? format(new Date(batch.submittedAt), 'dd MMM yy') : '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{batch.approvedAt ? format(new Date(batch.approvedAt), 'dd MMM yy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
