import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Award, Download, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/batches/${id}`),
      api.get(`/certificates/batch/${id}`).catch(() => ({ data: { data: [] } })),
    ]).then(([batchRes, certsRes]) => {
      setBatch(batchRes.data.data);
      setCertificates(certsRes.data.data ?? []);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <InlineLoader text="Loading batch details..." />;
  if (!batch) return <div className="text-center py-12 text-gray-500">Batch not found</div>;

  const canUpload = user?.role === 'TRAINING_CENTRE' &&
    batch.submittedById === user?.id &&
    (batch.status === 'DRAFT' || batch.status === 'SENT_BACK');

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 font-mono">{batch.batchCode}</h1>
            <Badge status={batch.status} />
            {batch.isOverdue && <Badge status="OVERDUE" />}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">{batch.courseName}</p>
        </div>
      </div>

      {/* Send back / rejection notice */}
      {batch.status === 'SENT_BACK' && batch.sendBackReason && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Batch Sent Back for Correction</p>
              <p className="text-sm text-amber-700 mt-1">{batch.sendBackReason}</p>
              {canUpload && (
                <Link to={`/batches/${batch.id}/resubmit`} className="btn-primary inline-flex items-center gap-2 mt-3 text-sm">
                  Re-upload & Resubmit
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {batch.status === 'REJECTED' && batch.rejectionReason && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800 text-sm">Batch Rejected</p>
              <p className="text-sm text-red-700 mt-1">{batch.rejectionReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Meta cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Training Centre</p>
          <p className="font-semibold text-sm mt-1">{batch.centre?.name}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">District</p>
          <p className="font-semibold text-sm mt-1">{batch.district?.name}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Total Candidates</p>
          <p className="font-semibold text-sm mt-1">{batch.totalCandidates}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Submitted</p>
          <p className="font-semibold text-sm mt-1">
            {batch.submittedAt ? format(new Date(batch.submittedAt), 'dd MMM yyyy') : '—'}
          </p>
        </div>
      </div>

      {/* Approval timeline */}
      <div className="card p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary-600" />
          Approval History
        </h2>
        {batch.approvals?.length === 0 ? (
          <p className="text-sm text-gray-400">No approvals yet</p>
        ) : (
          <div className="space-y-3">
            {batch.approvals?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 text-sm">
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                  a.decision === 'APPROVED' ? 'bg-green-500' :
                  a.decision === 'REJECTED' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <span className="font-medium">{a.officer?.name}</span>{' '}
                  <Badge status={a.decision} className="text-xs" />{' '}
                  <span className="text-gray-400 text-xs">
                    {format(new Date(a.createdAt), 'dd MMM yyyy HH:mm')}
                  </span>
                  {a.reason && <p className="text-gray-500 text-xs mt-0.5">Reason: {a.reason}</p>}
                </div>
              </div>
            ))}
            {batch.qualityReview && (
              <div className="flex items-start gap-3 text-sm border-t pt-3 mt-3">
                <div className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                  batch.qualityReview.decision === 'APPROVED' ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <div>
                  <span className="font-medium">{batch.qualityReview.reviewer?.name}</span>{' '}
                  <span className="text-gray-500">(Quality Team)</span>{' '}
                  <Badge status={batch.qualityReview.decision} className="text-xs" />{' '}
                  <span className="text-gray-400 text-xs">
                    {format(new Date(batch.qualityReview.createdAt), 'dd MMM yyyy HH:mm')}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidates table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary-600" />
            Candidates ({batch.candidates?.length ?? 0})
          </h2>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                {['#', 'Name', 'Email', 'Mobile', 'Gender', 'DOB', 'Course', 'Completion'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(batch.candidates ?? []).map((c: any, i: number) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{c.fullName}</td>
                  <td className="px-3 py-2 text-gray-500">{c.email}</td>
                  <td className="px-3 py-2 text-gray-500">{c.mobile}</td>
                  <td className="px-3 py-2 text-gray-500 capitalize">{c.gender}</td>
                  <td className="px-3 py-2 text-gray-400">{c.dateOfBirth ? format(new Date(c.dateOfBirth), 'dd MMM yyyy') : '—'}</td>
                  <td className="px-3 py-2">{c.courseName}</td>
                  <td className="px-3 py-2 text-gray-400">{c.completionDate ? format(new Date(c.completionDate), 'dd MMM yyyy') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award className="h-4 w-4 text-primary-600" />
              Certificates ({certificates.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {['Certificate #', 'Candidate', 'Status', 'Issued', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {certificates.map((cert: any) => (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-primary-600">{cert.certificateNumber}</td>
                    <td className="px-4 py-3 font-medium">{cert.candidate?.fullName}</td>
                    <td className="px-4 py-3"><Badge status={cert.status} /></td>
                    <td className="px-4 py-3 text-gray-400">
                      {cert.issuedAt ? format(new Date(cert.issuedAt), 'dd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 flex gap-2">
                      <Link
                        to={`/verify/${cert.certificateNumber}`}
                        target="_blank"
                        className="text-blue-600 hover:underline"
                      >
                        Verify
                      </Link>
                      {cert.status === 'GENERATED' || cert.status === 'DELIVERED' ? (
                        <a
                          href={`/api/certificates/${cert.certificateNumber}/download`}
                          className="text-green-600 hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
