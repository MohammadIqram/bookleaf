'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { DEMO_USERS } from '../lib/constants';

interface NavbarProps {
  connected: boolean;
  isPollingFallback: boolean;
}

export function Navbar({ connected, isPollingFallback }: NavbarProps) {
  const { user, logout, switchUser } = useAuth();
  const [showSwitcher, setShowSwitcher] = useState(false);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-md">
            🌿
          </div>
          <div>
            <div className="font-bold text-lg tracking-tight flex items-center gap-2">
              BookLeaf Publishing
              <span className="text-xs px-2 py-0.5 rounded font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Author Portal
              </span>
            </div>
            <div className="text-xs text-slate-400">Author Support &amp; Communication Portal</div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Real-time SSE Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 text-xs px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700">
            <span
              className={`w-2 h-2 rounded-full ${
                connected ? 'bg-emerald-400 animate-pulse' : isPollingFallback ? 'bg-amber-400' : 'bg-rose-400'
              }`}
            />
            <span className="text-slate-300">
              {connected ? 'Live (SSE)' : isPollingFallback ? 'Polling (10s)' : 'Disconnected'}
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-3">
              {/* User Profile Pill */}
              <div className="text-right hidden md:block">
                <div className="text-sm font-semibold text-slate-200">{user.name}</div>
                <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
                  <span>{user.email}</span>
                  <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Quick Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSwitcher(!showSwitcher)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                  title="Switch user account for demo testing"
                >
                  <span>Switch Demo User</span>
                  <span className="text-[10px]">▼</span>
                </button>

                {showSwitcher && (
                  <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50">
                    <div className="text-xs font-semibold text-slate-400 px-3 py-2 border-b border-slate-800">
                      Switch Demo Persona (1-Click)
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 mt-1">
                      {DEMO_USERS.map((demo) => (
                        <button
                          key={demo.email}
                          onClick={() => {
                            switchUser(demo.email);
                            setShowSwitcher(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-xs transition flex flex-col gap-0.5 ${
                            user.email === demo.email ? 'bg-slate-800 text-emerald-400' : 'hover:bg-slate-800/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{demo.name}</span>
                            <span
                              className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-bold ${
                                demo.role === 'ADMIN' ? 'bg-purple-900 text-purple-200' : 'bg-emerald-900 text-emerald-200'
                              }`}
                            >
                              {demo.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400">{demo.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-800/50 transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;
