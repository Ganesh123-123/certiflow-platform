import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/Login';
import { DashboardPage } from './pages/Dashboard';
import { BatchListPage } from './pages/training/BatchList';
import { NewBatchPage } from './pages/training/NewBatch';
import { BatchDetailPage } from './pages/BatchDetail';
import { ResubmitBatchPage } from './pages/training/ResubmitBatch';
import { DistrictBatchesPage } from './pages/district/DistrictBatches';
import { QualityQueuePage } from './pages/quality/QualityQueue';
import { StatePendingPage } from './pages/state/StatePending';
import { StateAllBatchesPage } from './pages/state/StateAllBatches';
import { AuditLogsPage } from './pages/state/AuditLogs';
import { OverdueBatchesPage } from './pages/state/OverdueBatches';
import { StatusBatchesPage } from './pages/StatusBatches';
import { CertificatesPage } from './pages/Certificates';
import { VerifyPage } from './pages/Verify';
import { PageLoader } from './components/ui/LoadingSpinner';

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/verify/:certificateNumber" element={<VerifyPage />} />

      {/* Protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/batches/status/:status" element={<StatusBatchesPage />} />
        <Route path="/certificates" element={<CertificatesPage />} />

        {/* Training Centre */}
        <Route
          path="/batches"
          element={
            <ProtectedRoute roles={['TRAINING_CENTRE']}>
              <BatchListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/batches/new"
          element={
            <ProtectedRoute roles={['TRAINING_CENTRE']}>
              <NewBatchPage />
            </ProtectedRoute>
          }
        />
        <Route path="/batches/:id" element={<BatchDetailPage />} />
        <Route
          path="/batches/:id/resubmit"
          element={
            <ProtectedRoute roles={['TRAINING_CENTRE']}>
              <ResubmitBatchPage />
            </ProtectedRoute>
          }
        />

        {/* District Officer */}
        <Route
          path="/district/batches"
          element={
            <ProtectedRoute roles={['DISTRICT_OFFICER']}>
              <DistrictBatchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/district/history"
          element={
            <ProtectedRoute roles={['DISTRICT_OFFICER']}>
              <DistrictBatchesPage showHistory />
            </ProtectedRoute>
          }
        />

        {/* Quality Team */}
        <Route
          path="/quality/pending"
          element={
            <ProtectedRoute roles={['QUALITY_TEAM']}>
              <QualityQueuePage />
            </ProtectedRoute>
          }
        />

        {/* State Officer */}
        <Route
          path="/state/pending"
          element={
            <ProtectedRoute roles={['STATE_OFFICER']}>
              <StatePendingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state/all-batches"
          element={
            <ProtectedRoute roles={['STATE_OFFICER']}>
              <StateAllBatchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state/overdue"
          element={
            <ProtectedRoute roles={['STATE_OFFICER']}>
              <OverdueBatchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/state/audit"
          element={
            <ProtectedRoute roles={['STATE_OFFICER']}>
              <AuditLogsPage />
            </ProtectedRoute>
          }
        />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
