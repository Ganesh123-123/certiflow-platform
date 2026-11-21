import React, { useEffect, useState } from 'react';
import api from '../../lib/api';
import { InlineLoader } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { format } from 'date-fns';
import { RefreshCw, ClipboardList } from 'lucide-react';

export function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/audit?page=${p}`);
      setLogs(res.data.data?.logs ?? []);
      setTotal(res.data.data?.total ?? 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []);

  const actionColors: Record<string, string> = {
    BATCH_SUBMITTED: 'text-blue-700 bg-blue-50',
    BATCH_CREATED: 'text-gray-700 bg-gray-50',
    DISTRICT_APPROVED: 'text-green-700 bg-green-50',
    DISTRICT_REJECTED: 'text-red-700 bg-red-50',
    DISTRICT_SENT_BACK: 'text-yellow-700 bg-yellow-50',
    DISTRICT_APPROVED_FINAL: 'text-teal-700 bg-teal-50',
    QUALITY_APPROVED: 'text-purple-700 bg-purple-50',
    QUALITY_REJECTED: 'text-red-700 bg-red-50',
    STATE_APPROVED: 'text-green-800 bg-green-100 font-bold',
    STATE_REJECTED: 'text-red-800 bg-red-100',
    CERTIFICATE_REVOKED: 'text-red-800 bg-red-200 font-bold',
    CANDIDATES_UPLOADED: 'text-indigo-700 bg-indigo-50',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Append-only record of all system actions ({total.toLocaleString()} entries)
          </p>
        </div>
        <button onClick={() => fetchLogs(1)} className="btn-secondary p-2"><RefreshCw className="h-4 w-4" /></button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <InlineLoader /> : (
          <>
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Timestamp', 'User', 'Role', 'Action', 'Entity', 'From → To', 'Reason'].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={ClipboardList} title="No audit logs yet" /></td></tr>
                ) : logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                      {format(new Date(log.createdAt), 'dd MMM yy HH:mm:ss')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{log.user?.name}</td>
                    <td className="px-4 py-3 text-gray-500">{log.userRole?.replace(/_/g, ' ')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono ${actionColors[log.action] ?? 'text-gray-700 bg-gray-50'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      <span className="text-gray-400">{log.entityType}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.previousState && log.newState ? (
                        <span className="text-gray-500">
                          {log.previousState} → <span className="font-medium text-gray-700">{log.newState}</span>
                        </span>
                      ) : log.newState ? (
                        <span className="font-medium text-gray-700">{log.newState}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-48 truncate" title={log.reason ?? undefined}>
                      {log.reason ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {total > pageSize && (
              <div className="flex items-center justify-between p-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => fetchLogs(page - 1)} disabled={page === 1} className="btn-secondary text-xs px-3 py-1 disabled:opacity-50">← Prev</button>
                  <button onClick={() => fetchLogs(page + 1)} disabled={page * pageSize >= total} className="btn-secondary text-xs px-3 py-1 disabled:opacity-50">Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
