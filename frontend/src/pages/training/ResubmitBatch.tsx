import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Upload, AlertCircle, CheckCircle, FileText,
  ArrowLeft, Download, X,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { InlineLoader } from '../../components/ui/LoadingSpinner';

interface ValidationError { row: number; field: string; message: string; }

export function ResubmitBatchPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [batch, setBatch] = useState<any>(null);
  const [batchLoading, setBatchLoading] = useState(true);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    errors: ValidationError[];
    validCount: number;
  } | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  useEffect(() => {
    if (!id) return;
    api.get(`/batches/${id}`)
      .then((r) => setBatch(r.data.data))
      .catch(() => toast.error('Failed to load batch'))
      .finally(() => setBatchLoading(false));
  }, [id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setUploadResult(null); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      setFile(f); setUploadResult(null);
    } else {
      toast.error('Only CSV and XLSX files are accepted');
    }
  };

  const handleFileUpload = async () => {
    if (!file || !id) return;
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/batches/${id}/candidates`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res.data.data;
      setUploadResult(result);
      if (result.success) {
        const detailRes = await api.get(`/batches/${id}`);
        setPreviewData(detailRes.data.data.candidates ?? []);
        setStep('preview');
        toast.success(`${result.validCount} candidates validated successfully!`);
      }
    } catch (err: any) {
      const data = err.response?.data?.data;
      if (data?.errors) {
        setUploadResult(data);
      } else {
        toast.error(err.response?.data?.message ?? 'Upload failed');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSubmitBatch = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await api.post(`/batches/${id}/submit`);
      toast.success('Batch resubmitted for district review! 🎉');
      navigate('/batches');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to submit batch');
    } finally {
      setSubmitting(false);
    }
  };

  const csvTemplate = [
    'Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date',
    'Ramesh Kumar,ramesh@example.com,9876543210,2000-01-15,Male,Digital Literacy,Pragati Skill Hub,2024-06-30',
  ].join('\n');

  if (batchLoading) return <InlineLoader text="Loading batch..." />;
  if (!batch) return <div className="text-center py-12 text-gray-500">Batch not found</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(`/batches/${id}`)}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resubmit Batch</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{batch.batchCode} · {batch.courseName}</p>
        </div>
      </div>

      {/* Send-back reason */}
      {batch.sendBackReason && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Returned for Correction</p>
              <p className="text-sm text-amber-700 mt-1">{batch.sendBackReason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload step */}
      {step === 'upload' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Upload Corrected Spreadsheet</h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-800 mb-1">Required columns:</p>
            <p className="text-xs text-blue-700 font-mono">
              Full Name · Email · Mobile · Date of Birth · Gender · Course Name · Training Centre · Completion Date
            </p>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer ${
              file
                ? 'border-green-400 bg-green-50'
                : 'border-gray-300 hover:border-primary-400 hover:bg-primary-50'
            }`}
          >
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload-resubmit"
            />
            <label htmlFor="file-upload-resubmit" className="cursor-pointer">
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                  <p className="font-medium text-green-700">{file.name}</p>
                  <p className="text-xs text-green-500">{(file.size / 1024).toFixed(1)} KB</p>
                  <span className="text-xs text-gray-500 mt-1">Click to change file</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="font-medium text-gray-600">Drop CSV or XLSX here</p>
                  <p className="text-xs text-gray-400">or click to browse (max 10MB)</p>
                </div>
              )}
            </label>
          </div>

          {/* Validation errors */}
          {uploadResult && !uploadResult.success && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="font-semibold text-red-700">
                  Validation Failed — {uploadResult.errors.length} error(s) found
                </span>
              </div>
              <p className="text-sm text-red-600 mb-3">
                ⚠ No records were saved. Fix all errors and re-upload.
              </p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {uploadResult.errors.map((e, i) => (
                  <div
                    key={i}
                    className="text-xs font-mono bg-red-100 text-red-700 rounded px-2 py-1.5 flex items-start gap-2"
                  >
                    <span className="text-red-400 flex-shrink-0">Row {e.row}</span>
                    <span className="text-red-500 flex-shrink-0">{e.field}:</span>
                    <span>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleFileUpload}
              disabled={!file || uploadLoading}
              className="btn-primary flex items-center gap-2 flex-1 justify-center"
            >
              {uploadLoading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploadLoading ? 'Validating...' : 'Upload & Validate'}
            </button>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvTemplate)}`}
              download="candidate_template.csv"
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="h-4 w-4" />
              Template
            </a>
          </div>
        </div>
      )}

      {/* Preview & submit step */}
      {step === 'preview' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {previewData.length} Candidates Ready for Resubmission
            </h2>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-72">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {['#', 'Name', 'Email', 'Mobile', 'Gender', 'Course', 'Completion'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 font-semibold text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {previewData.map((c, i) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 font-medium text-gray-800">{c.fullName}</td>
                    <td className="px-3 py-2 text-gray-500">{c.email}</td>
                    <td className="px-3 py-2 text-gray-500">{c.mobile}</td>
                    <td className="px-3 py-2 text-gray-500 capitalize">{c.gender}</td>
                    <td className="px-3 py-2">{c.courseName}</td>
                    <td className="px-3 py-2 text-gray-400">
                      {c.completionDate
                        ? format(new Date(c.completionDate), 'dd MMM yyyy')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmitBatch}
              disabled={submitting}
              className="btn-primary flex items-center gap-2 flex-1 justify-center py-2.5"
            >
              {submitting ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              {submitting ? 'Resubmitting...' : `Resubmit ${previewData.length} Candidates`}
            </button>
            <button onClick={() => setStep('upload')} className="btn-secondary">
              Re-upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
