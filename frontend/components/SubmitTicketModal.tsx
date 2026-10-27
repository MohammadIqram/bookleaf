'use client';

import React, { useState } from 'react';
import { api, ApiError } from '../lib/api';

interface SubmitTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: any[];
  onTicketCreated: (ticket: any) => void;
}

export function SubmitTicketModal({ isOpen, onClose, books, onTicketCreated }: SubmitTicketModalProps) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const names = Array.from(e.target.files).map((f) => f.name);
      setAttachments((prev) => [...prev, ...names]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side length validations
    if (subject.trim().length < 5 || subject.trim().length > 150) {
      setError('Subject must be between 5 and 150 characters.');
      return;
    }

    if (description.trim().length < 20 || description.trim().length > 5000) {
      setError('Description must be between 20 and 5000 characters.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await api.createTicket({
        subject: subject.trim(),
        description: description.trim(),
        bookId: selectedBookId || null,
        attachmentNames: attachments,
      });

      onTicketCreated(res.ticket);
      // Reset form
      setSubject('');
      setDescription('');
      setSelectedBookId('');
      setAttachments([]);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to submit ticket');
      } else {
        setError('An unexpected network error occurred.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Submit a Support Query</span>
            </h2>
            <p className="text-xs text-slate-400">Our author support team and AI assistant will review your query.</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-200 text-xs">
              {error}
            </div>
          )}

          {/* Book Scope Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Related Book (Optional)
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="">General / Account Level (No specific book)</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.status}) — ISBN: {b.isbn}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Subject <span className="text-rose-400">*</span>
              </label>
              <span className={`text-[11px] ${subject.length > 150 ? 'text-rose-400' : 'text-slate-400'}`}>
                {subject.length} / 150
              </span>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. Inquiring about Q3 royalty payout status"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* Detailed Description */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Detailed Description <span className="text-rose-400">*</span>
              </label>
              <span
                className={`text-[11px] ${
                  description.length < 20 ? 'text-amber-400' : description.length > 5000 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {description.length} / 5000 (min 20)
              </span>
            </div>
            <textarea
              required
              rows={5}
              placeholder="Please provide full details about your query, dates, order numbers, or questions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>

          {/* UI-Only Attachments */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Attachments (Optional)
            </label>
            <div className="flex items-center gap-3">
              <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-medium text-slate-200 transition inline-block">
                Choose Files
                <input type="file" multiple onChange={handleFileChange} className="hidden" />
              </label>
              <span className="text-[11px] text-slate-400">
                File attachments: stored name only (UI preview demo)
              </span>
            </div>

            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {attachments.map((file, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-xs text-slate-300 border border-slate-700"
                  >
                    📄 {file}
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-slate-400 hover:text-rose-400 text-xs ml-1"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/40 transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Creating Ticket...' : 'Submit Support Query'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubmitTicketModal;
