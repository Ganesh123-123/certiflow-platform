import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Award, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { InlineLoader } from '../components/ui/LoadingSpinner';

interface CertificateRow {
  id: string;
  certificateNumber: string;
  status: string;
  issuedAt: string | null;
  candidate: { fullName: string; courseName: string };
  batch: { batchCode: string; district: { name: string } };
}

interface CertificatePage {
  certificates: CertificateRow[];
  total: number;
  page: number;
  pageSize: number;
}

export function CertificatesPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status') === 'DELIVERED' ? 'DELIVERED' : '';
  const [result, setResult] = useState<CertificatePage>({
    certificates: [],
    total: 0,
    page: 1,
    pageSize: 20,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.get('/certificates', { params: { ...(status ? { status } : {}), page } })
      .then((response) => {
        if (active) setResult(response.data.data);
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message ?? 'Could not load certificates.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [status, page]);

  const certificates = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return result.certificates;
    return result.certificates.filter((certificate) =>
      certificate.certificateNumber.toLowerCase().includes(query) ||
      certificate.candidate.fullName.toLowerCase().includes(query) ||
      certificate.batch.batchCode.toLowerCase().includes(query)
    );
  }, [result.certificates, search]);

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/dashboard" aria-label="Back to dashboard" className="btn-secondary mt-1 p-2">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {status ? 'Delivered Certificates' : 'Certificates'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {result.total} {result.total === 1 ? 'certificate' : 'certificates'}{status ? ' delivered' : ' issued'}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="input-field pl-9"
            placeholder="Search certificates..."
            aria-label="Search certificates"
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <InlineLoader /> : error ? (
          <div className="p-6 text-sm font-medium text-red-600" role="alert">{error}</div>
        ) : certificates.length === 0 ? (
          <EmptyState
            icon={Award}
            title={search ? 'No matching certificates' : 'No certificates found'}
            description={search ? 'Try another certificate number, candidate, or batch.' : undefined}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Certificate', 'Candidate', 'Course', 'Batch', 'District', 'Issued', 'Status'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {certificates.map((certificate) => (
                    <tr key={certificate.id} className="transition-colors hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/verify/${certificate.certificateNumber}`} className="font-mono text-xs font-semibold text-primary-600 hover:underline">
                          {certificate.certificateNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800">{certificate.candidate.fullName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{certificate.candidate.courseName}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{certificate.batch.batchCode}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{certificate.batch.district.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {certificate.issuedAt ? format(new Date(certificate.issuedAt), 'dd MMM yy') : '—'}
                      </td>
                      <td className="px-4 py-3"><Badge status={certificate.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">Page {page} of {pageCount}</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary p-2"
                  aria-label="Previous page"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="btn-secondary p-2"
                  aria-label="Next page"
                  disabled={page >= pageCount || loading}
                  onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
