import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import { Batch } from '../types';

interface BatchPage {
  batches: Batch[];
  total: number;
}

const statusTitles: Record<string, string> = {
  APPROVED: 'Approved Batches',
  OVERDUE: 'Overdue Batches',
};

export function StatusBatchesPage() {
  const { status = '' } = useParams();
  const title = statusTitles[status];
  const [result, setResult] = useState<BatchPage>({ batches: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!title) {
      setLoading(false);
      setError('This batch status is not supported.');
      return () => { active = false; };
    }

    setLoading(true);
    setError('');
    api.get(`/batches/status/${status}`)
      .then((response) => {
        if (active) setResult(response.data.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message ?? 'Could not load batches.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [status, title]);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <Link to="/dashboard" aria-label="Back to dashboard" className="btn-secondary mt-1 p-2">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title ?? 'Batches'}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {title ? `${result.total} ${result.total === 1 ? 'batch' : 'batches'} in this status` : 'Batch status list'}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <InlineLoader /> : error ? (
          <div className="p-6 text-sm font-medium text-red-600" role="alert">{error}</div>
        ) : result.batches.length === 0 ? (
          <EmptyState icon={FileText} title={`No ${title?.toLowerCase() ?? 'batches'} found`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Batch Code', 'Course', 'Centre', 'District', 'Candidates', 'Status', 'Updated'].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.batches.map((batch) => (
                  <tr key={batch.id} className="transition-colors hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/batches/${batch.id}`} className="font-mono text-xs font-semibold text-primary-600 hover:underline">
                        {batch.batchCode}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-700">{batch.courseName}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{batch.centre?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{batch.district?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-medium text-gray-700">
                      {batch.totalCandidates ?? batch._count?.candidates ?? 0}
                    </td>
                    <td className="px-4 py-3"><Badge status={status === 'OVERDUE' ? 'OVERDUE' : batch.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{format(new Date(batch.updatedAt), 'dd MMM yy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
