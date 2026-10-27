'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../lib/constants';

interface TicketDetailModalProps {
  ticketId: string | null;
  onClose: () => void;
  isAdmin: boolean;
  currentUserId: string;
}

export function TicketDetailModal({ ticketId, onClose, isAdmin, currentUserId }: TicketDetailModalProps) {
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Admin AI Draft State
  const [aiDraft, setAiDraft] = useState<string>('');
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [isAiDraftAvailable, setIsAiDraftAvailable] = useState(true);

  // Admin Internal Notes State
  const [notes, setNotes] = useState<any[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [activeTab, setActiveTab] = useState<'thread' | 'notes'>('thread');

  // Load ticket details
  const fetchTicket = async () => {
    if (!ticketId) return;
    try {
      setLoading(true);
      const res = await api.getTicket(ticketId);
      setTicket(res.ticket);

      if (isAdmin) {
        // Fetch internal notes
        const notesRes = await api.getInternalNotes(ticketId);
        setNotes(notesRes.notes);

        // Fetch or pre-load AI draft
        loadAiDraft(ticketId);
      }
    } catch (err) {
      console.error('Failed to load ticket:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAiDraft = async (id: string) => {
    try {
      setAiDraftLoading(true);
      const res = await api.getAiDraft(id);
      if (res.draft?.body) {
        setAiDraft(res.draft.body);
        setIsAiDraftAvailable(true);
      }
    } catch (_err) {
      setIsAiDraftAvailable(false);
    } finally {
      setAiDraftLoading(false);
    }
  };

  const handleRegenerateDraft = async () => {
    if (!ticketId) return;
    try {
      setAiDraftLoading(true);
      const res = await api.regenerateAiDraft(ticketId);
      if (res.draft?.body) {
        setAiDraft(res.draft.body);
        setIsAiDraftAvailable(true);
      }
    } catch (_err) {
      setIsAiDraftAvailable(false);
    } finally {
      setAiDraftLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  if (!ticketId) return null;

  // Send message
  const handleSendMessage = async (isAi = false, textToSend?: string) => {
    const text = textToSend || replyText;
    if (!text.trim()) return;

    setSendingReply(true);
    try {
      const res = await api.addMessage(ticketId, text.trim(), isAi);
      setTicket((prev: any) => ({
        ...prev,
        messages: [...(prev.messages || []), res.ticketMessage],
      }));
      setReplyText('');
      if (isAi) setAiDraft('');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  // Add internal note (admin)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    setAddingNote(true);
    try {
      const res = await api.addInternalNote(ticketId, newNoteText.trim());
      setNotes((prev) => [...prev, res.note]);
      setNewNoteText('');
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  // Admin status/priority/category patch
  const handleUpdateField = async (field: string, value: string) => {
    try {
      const res = await api.patchTicket(ticketId, { [field]: value });
      setTicket((prev: any) => ({ ...prev, ...res.ticket }));
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  // Admin assign
  const handleToggleAssign = async () => {
    const isAssignedToMe = ticket.assignedAdminId === currentUserId;
    try {
      const res = await api.assignTicket(ticketId, isAssignedToMe);
      setTicket((prev: any) => ({ ...prev, ...res.ticket }));
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[92vh] overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base text-emerald-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
              {ticket?.ticketNumber || '...'}
            </span>
            <div>
              <h2 className="text-base font-bold text-white line-clamp-1">{ticket?.subject || 'Loading ticket...'}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Author: {ticket?.author?.name || 'Loading...'}</span>
                {ticket?.book && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-400 font-medium">Book: {ticket.book.title}</span>
                  </>
                )}
                <span>•</span>
                <span>Created {ticket?.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ''}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Admin Quick Action Toolbar */}
        {isAdmin && ticket && (
          <div className="px-6 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Status:</span>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateField('status', e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Priority:</span>
                <select
                  value={ticket.priority}
                  onChange={(e) => handleUpdateField('priority', e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Picker */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium">Category:</span>
                <select
                  value={ticket.category || ''}
                  onChange={(e) => handleUpdateField('category', e.target.value)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Unclassified</option>
                  {TICKET_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignment Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleAssign}
                className={`px-2.5 py-1 rounded-lg font-medium text-xs border transition ${
                  ticket.assignedAdminId === currentUserId
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800 hover:bg-amber-900/60'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                }`}
              >
                {ticket.assignedAdminId === currentUserId
                  ? '👤 Assigned to Me (Unassign)'
                  : ticket.assignedAdmin
                  ? `Assigned: ${ticket.assignedAdmin.name}`
                  : 'Assign to Me'}
              </button>
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              Loading ticket conversation thread...
            </div>
          ) : (
            <>
              {/* Admin AI Classification Card */}
              {isAdmin && ticket && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-300 uppercase tracking-wider text-[11px]">
                        AI Classification &amp; Triage
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ticket.aiClassificationStatus === 'DONE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {ticket.aiClassificationStatus === 'DONE' ? '✨ AI Suggestion Active' : 'Rules Fallback'}
                      </span>
                      <span className="text-[10px] text-slate-400">Source: {ticket.categorySource || 'N/A'}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 italic">
                    {ticket.aiReasoning || 'AI reasoning logged during automated ingestion.'}
                  </p>
                </div>
              )}

              {/* Admin Tab Switcher */}
              {isAdmin && (
                <div className="flex items-center gap-4 border-b border-slate-800 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('thread')}
                    className={`pb-2.5 transition border-b-2 ${
                      activeTab === 'thread'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Author Thread ({ticket.messages?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`pb-2.5 transition border-b-2 flex items-center gap-1.5 ${
                      activeTab === 'notes'
                        ? 'border-amber-500 text-amber-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🔒 Internal Notes ({notes.length})</span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-1.5 rounded">Admin Only</span>
                  </button>
                </div>
              )}

              {/* View: Internal Notes Tab (Admin Only) */}
              {isAdmin && activeTab === 'notes' ? (
                <div className="space-y-4">
                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                        No internal notes logged yet. Notes are strictly visible to admins and never shared with authors.
                      </div>
                    ) : (
                      notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200 space-y-1"
                        >
                          <div className="flex justify-between items-center text-[10px] text-amber-400/80">
                            <span className="font-bold">📝 {note.admin?.name || 'Admin'}</span>
                            <span>{new Date(note.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap">{note.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-800">
                    <textarea
                      rows={2}
                      placeholder="Add an internal investigation note, phone log, or financial verification update..."
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={addingNote || !newNoteText.trim()}
                        className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs transition disabled:opacity-50"
                      >
                        {addingNote ? 'Saving...' : 'Add Internal Note'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                /* View: Conversation Thread */
                <div className="space-y-4">
                  {ticket.messages?.map((msg: any) => {
                    const isStaff = msg.senderType === 'ADMIN';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isStaff ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
                          <span className="font-semibold text-slate-300">
                            {isStaff ? 'Team BookLeaf' : ticket.author?.name}
                          </span>
                          <span>•</span>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.isAiDraftBased && (
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800 px-1.5 py-0.2 rounded font-semibold">
                              AI-Assisted
                            </span>
                          )}
                        </div>
                        <div
                          className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap ${
                            isStaff
                              ? 'bg-emerald-950/60 border border-emerald-800/60 text-slate-100 rounded-tr-sm shadow-sm'
                              : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-tl-sm shadow-sm'
                          }`}
                        >
                          {msg.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Reply Box */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90 shrink-0 space-y-3">
          {/* Admin AI Drafter Section */}
          {isAdmin && activeTab === 'thread' && (
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <span>✨ AI Suggested Response Draft</span>
                  {!isAiDraftAvailable && (
                    <span className="text-[10px] text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800">
                      AI unavailable — manual template pre-filled
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerateDraft}
                    disabled={aiDraftLoading}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition disabled:opacity-50"
                  >
                    {aiDraftLoading ? 'Regenerating...' : '🔄 Regenerate'}
                  </button>
                  {aiDraft && (
                    <button
                      onClick={() => setAiDraft('')}
                      className="text-xs text-slate-400 hover:text-slate-200 transition"
                    >
                      Discard
                    </button>
                  )}
                </div>
              </div>

              {aiDraft && (
                <div className="space-y-2">
                  <textarea
                    rows={4}
                    value={aiDraft}
                    onChange={(e) => setAiDraft(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSendMessage(true, aiDraft)}
                      disabled={sendingReply}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:opacity-50"
                    >
                      {sendingReply ? 'Sending...' : 'Send AI Response to Author'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard Message Composer */}
          {ticket?.status === 'CLOSED' && !isAdmin ? (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-900 rounded-xl border border-slate-800">
              This ticket is resolved and closed. If you have an inquiry, please submit a new ticket.
            </div>
          ) : (
            <div className="flex gap-2">
              <textarea
                rows={2}
                placeholder={isAdmin ? 'Write a manual custom message to the author...' : 'Type a follow-up message...'}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button
                onClick={() => handleSendMessage(false)}
                disabled={sendingReply || !replyText.trim()}
                className="px-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 shrink-0 self-end py-3 shadow-lg shadow-emerald-900/40"
              >
                {sendingReply ? 'Sending...' : 'Send'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketDetailModal;
