'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TicketDetailModal } from './TicketDetailModal';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../lib/constants';

interface AdminPortalProps {
  currentUserId: string;
}

export function AdminPortal({ currentUserId }: AdminPortalProps) {
  const [stats, setStats] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Detail Modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, ticketsRes] = await Promise.all([
        api.getAdminStats(),
        api.getTickets({
          page,
          limit: 15,
          status: status || undefined,
          category: category || undefined,
          priority: priority || undefined,
          assignedTo: assignedTo || undefined,
          search: search || undefined,
        }),
      ]);

      setStats(statsRes.stats);
      setTickets(ticketsRes.tickets || []);
      setPagination(ticketsRes.pagination || { page: 1, limit: 15, totalCount: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to load admin queue data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, status, category, priority, assignedTo, search]);

  return (
    <div className="space-y-6">
      {/* 1. Admin Top Stats Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Open &amp; In-Progress</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.totalActiveCount ?? (stats?.openCount || 0)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Critical Unresolved</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{stats?.criticalCount ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Unassigned Queue</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{stats?.unassignedCount ?? 0}</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm">
          <div className="text-xs text-slate-400 font-medium">Avg Open Age</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            {stats?.avgAgeDays ? `${stats.avgAgeDays}d` : `${stats?.avgAgeHours || 0}h`}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-400 font-medium">Est. AI Cost (USD)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            ${stats?.aiMetrics?.estimatedCostUsd ?? '0.00'}
          </div>
        </div>
      </div>

      {/* 2. Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Text Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by ticket #, author, book, subject..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Clear Filter Button */}
          {(status || category || priority || assignedTo || search) && (
            <button
              onClick={() => {
                setStatus('');
                setCategory('');
                setPriority('');
                setAssignedTo('');
                setSearch('');
                setPage(1);
              }}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-800 rounded-xl border border-slate-700 transition"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="">All Statuses</option>
            {TICKET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="">All Categories</option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="">All Priorities</option>
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Assigned To Filter */}
          <select
            value={assignedTo}
            onChange={(e) => {
              setAssignedTo(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200"
          >
            <option value="">All Assignees</option>
            <option value="me">Assigned to Me</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* 3. Ticket Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
                <th className="py-3 px-4">Ticket</th>
                <th className="py-3 px-4">Author</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4 text-right">Age / SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading admin support queue...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No tickets found matching the specified filters.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const isCriticalOrHigh = t.priority === 'CRITICAL' || t.priority === 'HIGH';
                  const isOld = t.isOld; // > 3 days unresolved

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicketId(t.id)}
                      className={`hover:bg-slate-800/60 cursor-pointer transition ${
                        isCriticalOrHigh && t.status !== 'RESOLVED' && t.status !== 'CLOSED'
                          ? 'bg-rose-950/10'
                          : ''
                      }`}
                    >
                      {/* Ticket Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {t.ticketNumber}
                      </td>

                      {/* Author */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{t.author?.name}</div>
                        <div className="text-[10px] text-slate-400">{t.author?.authorCode}</div>
                      </td>

                      {/* Subject */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-medium text-slate-200 line-clamp-1">{t.subject}</div>
                        {t.book && <div className="text-[10px] text-indigo-400">📖 {t.book.title}</div>}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-slate-300 font-medium">{t.category || 'Unclassified'}</span>
                        {t.categorySource === 'AI' && (
                          <span className="ml-1 text-[9px] text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-800">
                            AI
                          </span>
                        )}
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.priority === 'CRITICAL'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : t.priority === 'MEDIUM'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'RESOLVED' || t.status === 'CLOSED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : t.status === 'IN_PROGRESS'
                              ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-300">
                        {t.assignedAdmin ? (
                          <span className="font-medium text-white">{t.assignedAdmin.name}</span>
                        ) : (
                          <span className="text-amber-400 font-semibold italic">Unassigned</span>
                        )}
                      </td>

                      {/* Age / SLA Warning */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className={`font-semibold ${
                            isOld ? 'text-rose-400 font-bold' : 'text-slate-400'
                          }`}
                        >
                          {t.ageDays > 0 ? `${t.ageDays}d ago` : `${t.ageHours || 0}h ago`}
                        </div>
                        {isOld && (
                          <div className="text-[9px] text-rose-400 font-bold uppercase">SLA Warning</div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-white">{tickets.length}</span> of{' '}
            <span className="font-semibold text-white">{pagination.totalCount}</span> tickets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition disabled:opacity-40"
            >
              Previous
            </button>
            <span className="px-2 font-medium">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 border border-slate-700 transition disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Ticket Detail Drawer/Modal */}
      <TicketDetailModal
        ticketId={selectedTicketId}
        onClose={() => {
          setSelectedTicketId(null);
          loadData();
        }}
        isAdmin={true}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default AdminPortal;
