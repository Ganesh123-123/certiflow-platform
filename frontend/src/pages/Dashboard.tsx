import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, Award, CalendarDays, CheckSquare,
  Clock3, FileText, Plus, Sparkles, TrendingUp,
} from 'lucide-react';
import { StatsCard } from '../components/ui/StatsCard';
import { InlineLoader } from '../components/ui/LoadingSpinner';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { format } from 'date-fns';
import { getSocket } from '../lib/socket';
import { Batch } from '../types';

interface DashboardStats {
  totalBatches: number;
  pendingBatches: number;
  approvedBatches: number;
  totalCertificates: number;
  deliveredCertificates: number;
  overdueBatches: number;
}

const roleQueueLinks: Record<string, string> = {
  TRAINING_CENTRE: '/batches',
  DISTRICT_OFFICER: '/district/batches',
  QUALITY_TEAM: '/quality/pending',
  STATE_OFFICER: '/state/pending',
};

const roleQueueLabels: Record<string, string> = {
  TRAINING_CENTRE: 'My Recent Batches',
  DISTRICT_OFFICER: 'Batches Pending My Review',
  QUALITY_TEAM: 'Quality Review Queue',
  STATE_OFFICER: 'Pending State Approval',
};

const actionLabels: Record<string, string> = {
  TRAINING_CENTRE: 'Create a batch',
  DISTRICT_OFFICER: 'Review batches',
  QUALITY_TEAM: 'Open quality queue',
  STATE_OFFICER: 'Review approvals',
};

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, batchesRes] = await Promise.allSettled([
        api.get('/dashboard/stats'),
        (async () => {
          switch (user?.role) {
            case 'TRAINING_CENTRE': return api.get('/batches/my?page=1');
            case 'DISTRICT_OFFICER': return api.get('/batches/district?page=1');
            case 'QUALITY_TEAM': return api.get('/quality/pending?page=1');
            case 'STATE_OFFICER': return api.get('/state/pending?page=1');
            default: return null;
          }
        })(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.data);
      }
      if (batchesRes.status === 'fulfilled' && batchesRes.value) {
        setRecentBatches(batchesRes.value.data?.data?.batches ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const refresh = () => fetchData();
    socket.on('batch:submitted', refresh);
    socket.on('batch:district_approved', refresh);
    socket.on('batch:state_approved', refresh);
    socket.on('certificate:generated', refresh);
    return () => {
      socket.off('batch:submitted', refresh);
      socket.off('batch:district_approved', refresh);
      socket.off('batch:state_approved', refresh);
      socket.off('certificate:generated', refresh);
    };
  }, [fetchData]);

  const role = user?.role ?? '';
  const queueLink = roleQueueLinks[role] ?? '/dashboard';
  const queueLabel = roleQueueLabels[role] ?? 'Recent Activity';
  const actionLink = role === 'TRAINING_CENTRE' ? '/batches/new' : queueLink;
  const actionLabel = actionLabels[role] ?? 'View workspace';
  const workspaceName = user?.centre?.name ?? user?.district?.name;
  const firstName = user?.name?.trim().split(/\s+/)[0] ?? 'there';

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-slate-950 via-[#101b36] to-blue-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10 sm:px-8 sm:py-8">
        <div className="pointer-events-none absolute -right-20 -top-32 -z-10 h-80 w-80 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-8rem] right-1/3 -z-10 h-64 w-64 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="relative flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-100">
                <Sparkles className="h-3.5 w-3.5 text-blue-300" />
                Certificate operations
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-medium text-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Workspace overview
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
              Your certificate operations, approvals, and batch activity - all in one place.
            </p>
            {workspaceName && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
                <span className="h-1 w-1 rounded-full bg-blue-300" />
                {workspaceName}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
            <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-300">
              <CalendarDays className="h-4 w-4 text-blue-300" />
              {format(new Date(), 'EEEE, dd MMMM yyyy')}
            </div>
            <Link
              to={actionLink}
              className="btn-primary inline-flex w-fit items-center justify-center gap-2 !rounded-xl !px-5 !py-3 !shadow-lg !shadow-blue-950/30"
            >
              {role === 'TRAINING_CENTRE' ? <Plus className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
              {actionLabel}
            </Link>
          </div>
        </div>
      </section>

      {stats ? (
        <section aria-label="Platform statistics" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatsCard title="Total batches" value={stats.totalBatches} icon={FileText} color="blue" />
          <StatsCard title="Pending review" value={stats.pendingBatches} icon={Clock3} color="yellow" />
          <StatsCard title="Approved" value={stats.approvedBatches} icon={CheckSquare} color="green" to="/batches/status/APPROVED" />
          <StatsCard title="Certificates" value={stats.totalCertificates} icon={Award} color="purple" to="/certificates" />
          <StatsCard title="Delivered" value={stats.deliveredCertificates} icon={TrendingUp} color="indigo" to="/certificates?status=DELIVERED" />
          <StatsCard title="Overdue" value={stats.overdueBatches} icon={AlertTriangle} color="red" to="/batches/status/OVERDUE" />
        </section>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-slate-200/70 bg-white" />
          ))}
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.8fr)]">
        <div className="card overflow-hidden !rounded-2xl">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold tracking-tight text-slate-900">{queueLabel}</h2>
              <p className="mt-1 text-xs text-slate-500">A quick look at your latest activity</p>
            </div>
            <Link
              to={queueLink}
              className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-50"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {loading ? (
            <InlineLoader text="Loading your batches..." />
          ) : recentBatches.length === 0 ? (
            <EmptyState
              title="Nothing here just yet"
              description={role === 'TRAINING_CENTRE'
                ? 'Create your first batch to start the certificate workflow.'
                : 'New items will appear here when they are ready for your review.'}
              action={role === 'TRAINING_CENTRE' ? (
                <Link to="/batches/new" className="btn-primary mt-2 inline-flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Create a batch
                </Link>
              ) : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[690px] text-sm">
                <thead className="bg-slate-50/80">
                  <tr>
                    {['Batch', 'Course', 'District', 'Candidates', 'Status', 'Submitted'].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-[0.13em] text-slate-500 first:pl-6"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/80">
                  {recentBatches.slice(0, 5).map((batch) => (
                    <tr key={batch.id} className="group transition-colors hover:bg-blue-50/30">
                      <td className="px-5 py-4 first:pl-6">
                        <Link
                          to={`/batches/${batch.id}`}
                          className="font-mono text-xs font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                        >
                          {batch.batchCode}
                        </Link>
                      </td>
                      <td className="max-w-[220px] truncate px-5 py-4 text-xs font-medium text-slate-700">
                        {batch.courseName}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500">{batch.district?.name ?? '—'}</td>
                      <td className="px-5 py-4 text-xs font-semibold tabular-nums text-slate-700">
                        {batch.totalCandidates ?? batch._count?.candidates ?? 0}
                      </td>
                      <td className="px-5 py-4"><Badge status={batch.status} /></td>
                      <td className="px-5 py-4 text-xs text-slate-500">
                        {batch.submittedAt ? format(new Date(batch.submittedAt), 'dd MMM yy') : 'Not submitted'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5">
          <div className="card overflow-hidden !rounded-2xl">
            <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Clock3 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Your workflow</h2>
                <p className="mt-0.5 text-xs text-slate-500">Current workload at a glance</p>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-700">Awaiting review</span>
                </div>
                <span className="text-lg font-bold tabular-nums text-slate-900">{stats?.pendingBatches ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckSquare className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-700">Approved batches</span>
                </div>
                <span className="text-lg font-bold tabular-nums text-slate-900">{stats?.approvedBatches ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium text-slate-700">Overdue batches</span>
                </div>
                <span className="text-lg font-bold tabular-nums text-slate-900">{stats?.overdueBatches ?? '—'}</span>
              </div>
            </div>
            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3">
              <Link to={queueLink} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900">
                {role === 'TRAINING_CENTRE' ? 'View my batches' : actionLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <Link
            to="/verify"
            className="dashboard-verify-card group relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 transition hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5"
          >
            <div className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-blue-100/60 transition-transform group-hover:scale-110" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white text-blue-700 shadow-sm">
                  <Award className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-slate-900">Verify a certificate</h2>
                <p className="mt-1.5 max-w-[220px] text-xs leading-5 text-slate-600">
                  Check the authenticity and current status of an issued certificate.
                </p>
              </div>
              <ArrowUpRight className="relative mt-1 h-4 w-4 shrink-0 text-blue-700 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </div>
          </Link>
        </aside>
      </section>
    </div>
  );
}
