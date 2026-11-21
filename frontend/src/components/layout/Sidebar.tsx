import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  FileText,
  Upload,
  CheckSquare,
  Award,
  LogOut,
  AlertTriangle,
  ClipboardList,
  ShieldCheck,
  Users,
} from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: Record<string, NavItem[]> = {
  TRAINING_CENTRE: [
    { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/batches',    label: 'My Batches', icon: FileText },
    { to: '/batches/new',label: 'New Batch',  icon: Upload },
  ],
  DISTRICT_OFFICER: [
    { to: '/dashboard',       label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/district/batches',label: 'Review Queue',   icon: CheckSquare },
    { to: '/district/history',label: 'Review History', icon: ClipboardList },
  ],
  QUALITY_TEAM: [
    { to: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
    { to: '/quality/pending',label: 'Quality Queue',icon: CheckSquare },
  ],
  STATE_OFFICER: [
    { to: '/dashboard',       label: 'Dashboard',      icon: LayoutDashboard },
    { to: '/state/pending',   label: 'Pending Approval',icon: CheckSquare },
    { to: '/state/all-batches',label: 'All Batches',   icon: FileText },
    { to: '/state/overdue',   label: 'Overdue Alerts', icon: AlertTriangle },
    { to: '/state/audit',     label: 'Audit Logs',     icon: ClipboardList },
  ],
};

const roleLabels: Record<string, string> = {
  TRAINING_CENTRE: 'Training Centre',
  DISTRICT_OFFICER: 'District Officer',
  QUALITY_TEAM: 'Quality Team',
  STATE_OFFICER: 'State Officer',
};

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = navItems[user.role] ?? [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 w-64 bg-slate-950 text-white flex flex-col z-50 shadow-2xl transition-transform duration-300 lg:z-30',
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
      {/* Logo */}
      <div className="p-5 border-b border-primary-800">
        <div className="flex items-center gap-3">
          <div className="bg-primary-600 p-2.5 rounded-xl shadow-lg">
            <Award className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white">CertiFlow</div>
            <div className="text-primary-400 text-xs">Pragati Skills Mission</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <p className="text-primary-500 text-xs font-semibold uppercase tracking-widest px-3 py-2">
          Navigation
        </p>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                isActive
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {/* Verify link (always visible) */}
        <div className="mt-4 pt-4 border-t border-primary-800">
          <a
            href="/verify"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-primary-400 hover:bg-primary-800 hover:text-white transition-colors"
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0" />
            Verify Certificate
          </a>
        </div>
      </nav>

      {/* User panel */}
      <div className="p-4 border-t border-primary-800 bg-primary-900/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-primary-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0">
            {user.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-primary-400 truncate">{roleLabels[user.role]}</p>
            {user.district && (
              <p className="text-xs text-primary-500 truncate">{user.district.name}</p>
            )}
            {user.centre && (
              <p className="text-xs text-primary-500 truncate">{user.centre.name}</p>
            )}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-primary-400 hover:text-red-400 text-xs transition-colors w-full px-2 py-1.5 rounded-lg hover:bg-primary-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign Out
        </button>
      </div>
      </aside>
    </>
  );
}
