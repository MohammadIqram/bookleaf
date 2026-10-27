'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { SubmitTicketModal } from './SubmitTicketModal';
import { TicketDetailModal } from './TicketDetailModal';

interface AuthorPortalProps {
  currentUserId: string;
}

export function AuthorPortal({ currentUserId }: AuthorPortalProps) {
  const [activeTab, setActiveTab] = useState<'books' | 'tickets'>('books');
  const [books, setBooks] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, ticketsRes] = await Promise.all([
        api.getBooks(),
        api.getTickets({ limit: 50 }),
      ]);
      setBooks(booksRes.books || []);
      setTickets(ticketsRes.tickets || []);
    } catch (err) {
      console.error('Error loading author data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTicketCreated = (newTicket: any) => {
    setTickets((prev) => [newTicket, ...prev]);
    setActiveTab('tickets');
    setSelectedTicketId(newTicket.id);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Author Workspace &amp; Support</h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your published catalog, view royalty accruals, and communicate directly with the BookLeaf team.
          </p>
        </div>
        <button
          onClick={() => setIsSubmitModalOpen(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/40 transition flex items-center gap-2 shrink-0"
        >
          <span>✍️ Submit Support Query</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('books')}
          className={`pb-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'books'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>📚 My Published Catalog</span>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{books.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('tickets')}
          className={`pb-3 transition border-b-2 flex items-center gap-2 ${
            activeTab === 'tickets'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🎫 My Support Queries</span>
          <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-300">{tickets.length}</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 text-sm">Loading author records...</div>
      ) : activeTab === 'books' ? (
        /* View: My Books */
        <div className="space-y-4">
          {books.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              No books currently registered under this author profile.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {books.map((book) => {
                const inProd = !book.publicationDate || book.status.toLowerCase().includes('production');
                return (
                  <div
                    key={book.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition shadow-sm"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-bold">
                          {book.bookCode}
                        </span>
                        <h3 className="text-base font-bold text-white mt-0.5">{book.title}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {book.genre} • ISBN: {book.isbn || 'Pending Assignment'}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          inProd
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {book.status}
                      </span>
                    </div>

                    {/* Financial Figures Strip */}
                    <div className="grid grid-cols-4 gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">MRP</div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5">
                          {book.mrp ? `₹${book.mrp}` : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Copies Sold</div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5">
                          {inProd ? 'No sales yet' : book.totalCopiesSold}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Royalty Paid</div>
                        <div className="text-xs font-semibold text-slate-200 mt-0.5">
                          ₹{book.royaltyPaid || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-medium">Pending Payout</div>
                        <div className="text-xs font-bold text-emerald-400 mt-0.5">
                          ₹{book.royaltyPending || 0}
                        </div>
                      </div>
                    </div>

                    {/* Rollover notice if pending < 1000 */}
                    {book.rolloverNotice && (
                      <div className="text-[11px] p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 flex items-center gap-1.5">
                        <span>ℹ️</span>
                        <span>{book.rolloverNotice}</span>
                      </div>
                    )}

                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span>
                        Published: {book.publicationDate ? new Date(book.publicationDate).toLocaleDateString() : 'Not yet published'}
                      </span>
                      <span>
                        Platforms: {book.availableOn?.length ? book.availableOn.join(', ') : 'None active'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* View: My Tickets */
        <div className="space-y-3">
          {tickets.length === 0 ? (
            <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
              You haven't submitted any support queries yet. Click "Submit Support Query" above to reach our team.
            </div>
          ) : (
            tickets.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedTicketId(t.id)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl cursor-pointer transition flex items-center justify-between gap-4 shadow-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400 bg-slate-800 px-2 py-0.5 rounded">
                      {t.ticketNumber}
                    </span>
                    <h3 className="text-sm font-semibold text-white">{t.subject}</h3>
                    {t.book && (
                      <span className="text-[11px] text-slate-400">• Book: {t.book.title}</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">{t.description}</p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.status === 'RESOLVED' || t.status === 'CLOSED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : t.status === 'IN_PROGRESS'
                        ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {t.status}
                  </span>
                  <span className="text-slate-400 text-xs">➔</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      <SubmitTicketModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        books={books}
        onTicketCreated={handleTicketCreated}
      />

      <TicketDetailModal
        ticketId={selectedTicketId}
        onClose={() => {
          setSelectedTicketId(null);
          loadData();
        }}
        isAdmin={false}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default AuthorPortal;
