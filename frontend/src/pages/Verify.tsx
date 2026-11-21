import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Search, CheckCircle, XCircle, AlertCircle, Award, Shield } from 'lucide-react';
import api from '../lib/api';

interface VerifyResult {
  status: 'VALID' | 'REVOKED' | 'NOT_FOUND';
  certificateNumber?: string;
  candidateName?: string;
  courseName?: string;
  trainingCentre?: string;
  completionDate?: string;
  issuedAt?: string;
  revokedAt?: string;
  revocationReason?: string;
}

export function VerifyPage() {
  const { certificateNumber: paramCertNum } = useParams<{ certificateNumber?: string }>();
  const [certNumber, setCertNumber] = useState(paramCertNum ?? '');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-verify if cert number in URL
  useEffect(() => {
    if (paramCertNum) verify(paramCertNum);
  }, [paramCertNum]);

  const verify = async (num?: string) => {
    const target = (num ?? certNumber).trim().toUpperCase();
    if (!target) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.get(`/certificates/verify/${target}`);
      setResult(res.data.data);
    } catch {
      setResult({ status: 'NOT_FOUND' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 ring-1 ring-white/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Certificate Verification</h1>
          <p className="text-primary-300 text-sm mt-2">
            Pragati Skills Mission · Verify certificate authenticity
          </p>
        </div>

        {/* Verify card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-8">
            <div className="flex gap-2 mb-6">
              <input
                value={certNumber}
                onChange={(e) => setCertNumber(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && verify()}
                className="input-field flex-1 font-mono uppercase"
                placeholder="PSM-2024-PUN-ABC123"
              />
              <button
                onClick={() => verify()}
                disabled={loading || !certNumber.trim()}
                className="btn-primary flex items-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {loading ? 'Checking...' : 'Verify'}
              </button>
            </div>

            {/* Result */}
            {result && (
              <div
                className={`rounded-xl p-6 ${
                  result.status === 'VALID'
                    ? 'bg-green-50 border border-green-200'
                    : result.status === 'REVOKED'
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-start gap-4 mb-4">
                  {result.status === 'VALID' ? (
                    <CheckCircle className="h-9 w-9 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : result.status === 'REVOKED' ? (
                    <XCircle className="h-9 w-9 text-red-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-9 w-9 text-gray-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h3
                      className={`text-lg font-bold ${
                        result.status === 'VALID'
                          ? 'text-green-700'
                          : result.status === 'REVOKED'
                          ? 'text-red-700'
                          : 'text-gray-600'
                      }`}
                    >
                      {result.status === 'VALID'
                        ? '✓ Certificate is VALID'
                        : result.status === 'REVOKED'
                        ? '✗ Certificate REVOKED'
                        : 'Certificate Not Found'}
                    </h3>
                    {result.certificateNumber && (
                      <p className="text-sm font-mono text-gray-500 mt-0.5">
                        {result.certificateNumber}
                      </p>
                    )}
                  </div>
                </div>

                {result.status === 'VALID' && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Candidate</p>
                      <p className="font-semibold text-gray-900 mt-0.5">{result.candidateName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Course</p>
                      <p className="font-medium text-gray-800 mt-0.5">{result.courseName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Training Centre</p>
                      <p className="font-medium text-gray-700 mt-0.5">{result.trainingCentre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold">Issued On</p>
                      <p className="font-medium text-gray-700 mt-0.5">
                        {result.issuedAt
                          ? new Date(result.issuedAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'long',
                              year: 'numeric',
                            })
                          : '—'}
                      </p>
                    </div>
                  </div>
                )}

                {result.status === 'REVOKED' && (
                  <div className="text-sm text-red-700 space-y-1">
                    <p>
                      <span className="font-medium">Revoked on:</span>{' '}
                      {result.revokedAt
                        ? new Date(result.revokedAt).toLocaleDateString('en-IN')
                        : '—'}
                    </p>
                    {result.revocationReason && (
                      <p>
                        <span className="font-medium">Reason:</span> {result.revocationReason}
                      </p>
                    )}
                  </div>
                )}

                {result.status === 'NOT_FOUND' && (
                  <p className="text-sm text-gray-600">
                    No certificate found with number{' '}
                    <code className="font-mono bg-gray-100 px-1 rounded">{certNumber}</code>.
                    Please check the number and try again.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary-600" />
              <span className="text-xs text-gray-500">Pragati Skills Mission · Government of India</span>
            </div>
            <a href="/login" className="text-xs text-primary-600 hover:text-primary-700 font-medium">
              Staff Login →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
