import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <TopBar onMenuClick={() => setMobileNavOpen(true)} />
      <main className="pt-16 min-h-screen lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
