import React, { useState, useEffect, useRef } from 'react';
import { Bell, ChevronDown, Menu, Moon, Sun, User } from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, switchUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showDemoSwitcher, setShowDemoSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [switching, setSwitching] = useState(false);

  const switcherRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setShowDemoSwitcher(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch {
      // notifications are non-critical
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleSwitch = async (email: string) => {
    if (email === user?.email) {
      setShowDemoSwitcher(false);
      return;
    }
    setSwitching(true);
    setShowDemoSwitcher(false);
    try {
      await switchUser(email);
      toast.success('Switched user successfully');
      window.location.href = '/dashboard';
    } catch (err: any) {
      toast.error('Switch failed: ' + (err.response?.data?.message ?? err.message));
      setSwitching(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  return (
    <div className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 flex items-center justify-between px-4 sm:px-6 z-20 shadow-sm">
      {/* Left: breadcrumb / context */}
      <div className="flex items-center min-w-0">
        <button
          aria-label="Open navigation"
          onClick={onMenuClick}
          className="mr-3 p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-slate-800 hidden sm:inline">Pragati Skills Mission</span>
        <span className="text-slate-300 mx-2 hidden md:inline">|</span>
        <span className="text-xs text-slate-500 hidden md:inline">Certificate Issuance Platform</span>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {switching && (
          <span className="text-xs text-gray-500 animate-pulse">Switching...</span>
        )}

        {/* Demo user switcher */}
        <div className="relative" ref={switcherRef}>
          <button
            onClick={() => setShowDemoSwitcher(!showDemoSwitcher)}
            disabled={switching}
            className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium disabled:opacity-50"
          >
            🎭 Demo Switcher
            <ChevronDown className="h-3 w-3" />
          </button>

          {showDemoSwitcher && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="bg-amber-50 px-3 py-2 border-b border-amber-100">
                <p className="text-xs font-semibold text-amber-800">🎭 Switch Demo User</p>
                <p className="text-xs text-amber-600">Password: Demo@1234</p>
              </div>
              <div className="p-1.5 max-h-72 overflow-y-auto">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleSwitch(u.email)}
                    className={`w-full text-left px-3 py-2.5 text-sm rounded-lg transition-colors ${
                      user?.email === u.email
                        ? 'bg-primary-50 text-primary-700 border border-primary-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-800 flex items-center gap-2">
                      {user?.email === u.email && (
                        <span className="text-xs bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded">
                          Current
                        </span>
                      )}
                      {u.name}
                    </div>
                    <div className="text-xs text-gray-400">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <h4 className="font-semibold text-sm text-gray-900">Notifications</h4>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center">
                    <Bell className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No notifications yet</p>
                  </div>
                ) : (
                  notifications.slice(0, 15).map((n) => (
                    <div
                      key={n.id}
                      className={`px-4 py-3 border-b border-gray-50 last:border-0 ${
                        !n.read ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />
                        )}
                        <div className={!n.read ? '' : 'pl-4'}>
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-semibold">
          {user?.name?.[0]?.toUpperCase() ?? <User className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
}
