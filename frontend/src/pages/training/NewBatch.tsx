import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Upload, AlertCircle, CheckCircle, FileText,
  ArrowLeft, Download, X,
} from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const batchSchema = z.object({
  courseName: z.string().min(2, 'Course name required (min 2 chars)'),
  districtId: z.string().min(1, 'Please select a district'),
});
type BatchForm = z.infer<typeof batchSchema>;

interface ValidationError { row: number; field: string; message: string; }

type Step = 'info' | 'upload' | 'preview';

export function NewBatchPage() {
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<any[]>([]);
  const [step, setStep] = useState<Step>('info');
  const [batchId, setBatchId] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    errors: ValidationError[];
    validCount: number;
  } | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BatchForm>({ resolver: zodResolver(batchSchema) });

  useEffect(() => {
    api.get('/districts').then((r) => setDistricts(r.data.data ?? []));
  }, []);

  const onCreateBatch = async (data: BatchForm) => {
    try {
      const res = await api.post('/batches', data);
      setBatchId(res.data.data.id);
      setStep('upload');
      toast.success('Batch created! Now upload the student spreadsheet.');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create batch');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setUploadResult(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && (f.name.endsWith('.csv') || f.name.endsWith('.xlsx'))) {
      setFile(f);
      setUploadResult(null);
    } else {
      toast.error('Only CSV and XLSX files are accepted');
    }
  };

  const handleFileUpload = async () => {
    if (!file || !batchId) return;
    setUploadLoading(true);
    setUploadResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post(`/batches/${batchId}/candidates`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const result = res.data.data;
      setUploadResult(result);
      if (result.success) {
        const detailRes = await api.get(`/batches/${batchId}`);
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
    if (!batchId) return;
    setSubmitting(true);
    try {
      await api.post(`/batches/${batchId}/submit`);
      toast.success('Batch submitted for district review! 🎉');
      navigate('/batches');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to submit batch');
    } finally {
      setSubmitting(false);
    }
  };

  const stepIndex: Record<Step, number> = { info: 0, upload: 1, preview: 2 };
  const steps: { key: Step; label: string }[] = [
    { key: 'info',    label: 'Batch Info' },
    { key: 'upload',  label: 'Upload CSV' },
    { key: 'preview', label: 'Preview & Submit' },
  ];

  const csvTemplate = [
    'Full Name,Email,Mobile,Date of Birth,Gender,Course Name,Training Centre,Completion Date',
    'Ramesh Kumar,ramesh@example.com,9876543210,2000-01-15,Male,Digital Literacy,Pragati Skill Hub,2024-06-30',
    'Priya Sharma,priya@example.com,9876543211,1999-05-20,Female,Digital Literacy,Pragati Skill Hub,2024-06-30',
  ].join('\n');

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/batches')}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Batch</h1>
          <p className="text-sm text-gray-500 mt-0.5">Submit a training batch for approval</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center">
        {steps.map((s, i) => (
          <React.Fragment key={s.key}>
            <div className="flex items-center gap-2">
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  stepIndex[step] === i
                    ? 'bg-primary-600 text-white'
                    : stepIndex[step] > i
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {stepIndex[step] > i ? '✓' : i + 1}
              </span>
              <span
                className={`text-sm font-medium ${
                  stepIndex[step] === i ? 'text-primary-600' : 'text-gray-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < 2 && (
              <div
                className={`flex-1 h-px mx-3 ${
                  stepIndex[step] > i ? 'bg-green-400' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Batch Info */}
      {step === 'info' && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Batch Information</h2>
          <form onSubmit={handleSubmit(onCreateBatch)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Course Name <span className="text-red-500">*</span>
              </label>
              <input
                {...register('courseName')}
                className="input-field"
                placeholder="e.g., Digital Literacy Programme 2024"
              />
              {errors.courseName && (
                <p className="text-red-500 text-xs mt-1">{errors.courseName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Target District <span className="text-red-500">*</span>
              </label>
              <select {...register('districtId')} className="input-field">
                <option value="">— Select District —</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              {errors.districtId && (
                <p className="text-red-500 text-xs mt-1">{errors.districtId.message}</p>
              )}
            </div>
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary flex items-center gap-2 w-full justify-center"
              >
                {isSubmitting && (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                )}
                Create Batch & Continue →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Upload Student Spreadsheet</h2>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-800 mb-1">Required columns:</p>
            <p className="text-xs text-blue-700 font-mono">
              Full Name · Email · Mobile · Date of Birth · Gender · Course Name · Training Centre · Completion Date
            </p>
          </div>

          {/* Drop zone */}
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
              id="file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
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
                ⚠ No records were saved. Fix all errors and re-upload the file.
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

      {/* Step 3: Preview & Submit */}
      {step === 'preview' && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {previewData.length} Candidates Ready for Submission
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

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <strong>Important:</strong> This batch will require approval from{' '}
            <strong>2 distinct district officers</strong>
            {previewData.length > 50 && (
              <>
                {' '}and then{' '}
                <strong>quality team review</strong> (batch has {previewData.length} candidates, threshold is 50)
              </>
            )}{' '}
            before final state approval.
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
              {submitting ? 'Submitting...' : `Submit ${previewData.length} Candidates for Review`}
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
