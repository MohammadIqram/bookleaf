'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useTicketStore } from '../store/useTicketStore';
import { Navbar } from '../components/Navbar';
import { AuthorPortal } from '../components/AuthorPortal';
import { AdminPortal } from '../components/AdminPortal';
import { useSSE, SSEEvent } from '../hooks/useSSE';
import { DEMO_USERS } from '../lib/constants';

function PortalContent() {
  const { user, login, loading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sseTriggerCount, setSseTriggerCount] = useState(0);

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  // Real-time SSE hook
  const { connected, isPollingFallback } = useSSE((event: SSEEvent) => {
    // Whenever an SSE event arrives (new ticket, updated ticket, new message), increment trigger counter to refresh view
    setSseTriggerCount((c) => c + 1);
    useTicketStore.getState().triggerRealtimeRefresh();
  });

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);
    try {
      await login(email.trim(), password.trim());
    } catch (err: any) {
      setLoginError(err.message || 'Invalid email or password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (demoEmail: string, demoRole: string) => {
    setLoginError(null);
    setIsSubmitting(true);
    try {
      const pwd = demoRole === 'ADMIN' ? 'Admin@123' : 'Author@123';
      await login(demoEmail, pwd);
    } catch (err: any) {
      setLoginError(err.message || 'Demo login failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
        Initializing BookLeaf Portal...
      </div>
    );
  }

  // Login View
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-emerald-600 items-center justify-center text-2xl shadow-xl shadow-emerald-950">
            🌿
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            BookLeaf Publishing
          </h2>
          <p className="text-xs text-slate-400">
            Author Support &amp; Communication Portal
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 border border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 space-y-6">
            {loginError && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 text-rose-200 text-xs rounded-xl">
                {loginError}
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold tracking-wide transition shadow-lg shadow-emerald-900/40 disabled:opacity-50"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Quick Demo Logins Section */}
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <div className="text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                1-Click Demo Evaluation Profiles
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('admin@bookleaf.com', 'ADMIN')}
                  className="p-2.5 text-left bg-purple-950/40 hover:bg-purple-900/50 border border-purple-800/60 rounded-xl transition flex flex-col gap-0.5"
                >
                  <span className="font-bold text-purple-200">Super Admin</span>
                  <span className="text-[10px] text-purple-300/70">admin@bookleaf.com</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('ananya.reddy@email.com', 'AUTHOR')}
                  className="p-2.5 text-left bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-xl transition flex flex-col gap-0.5"
                >
                  <span className="font-bold text-emerald-200">Ananya Reddy</span>
                  <span className="text-[10px] text-emerald-300/70">Unpaid Royalty (AUTH003)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('sneha.kulkarni@email.com', 'AUTHOR')}
                  className="p-2.5 text-left bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-xl transition flex flex-col gap-0.5"
                >
                  <span className="font-bold text-emerald-200">Sneha Kulkarni</span>
                  <span className="text-[10px] text-emerald-300/70">In Production (AUTH007)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickDemoLogin('priya.sharma@email.com', 'AUTHOR')}
                  className="p-2.5 text-left bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/60 rounded-xl transition flex flex-col gap-0.5"
                >
                  <span className="font-bold text-emerald-200">Priya Sharma</span>
                  <span className="text-[10px] text-emerald-300/70">Print Defect (AUTH001)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated Portal View
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar connected={connected} isPollingFallback={isPollingFallback} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.role === 'ADMIN' ? (
          <AdminPortal currentUserId={user.id} />
        ) : (
          <AuthorPortal currentUserId={user.id} />
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        BookLeaf Publishing Support &amp; Communication Portal • Real-Time SSE Enabled
      </footer>
    </div>
  );
}

export default function Home() {
  return <PortalContent />;
}
