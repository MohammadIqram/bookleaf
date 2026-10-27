const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('bookleaf_token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorObj = data?.error;
    const message = errorObj?.message || response.statusText || 'Request failed';
    const code = errorObj?.code || `HTTP_${response.status}`;
    const details = errorObj?.details || null;

    throw new ApiError(message, code, response.status, details);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiFetch<{ message: string }>('/auth/logout', { method: 'POST' }),
  getMe: () => apiFetch<{ user: any }>('/auth/me'),

  // Books
  getBooks: (authorId?: string) =>
    apiFetch<{ books: any[] }>(`/books${authorId ? `?authorId=${authorId}` : ''}`),
  getBook: (id: string) => apiFetch<{ book: any }>(`/books/${id}`),

  // Tickets
  getTickets: (queryParams: Record<string, any> = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiFetch<{ tickets: any[]; pagination: any }>(`/tickets${query}`);
  },
  getTicket: (id: string) => apiFetch<{ ticket: any }>(`/tickets/${id}`),
  createTicket: (data: { subject: string; description: string; bookId?: string | null; attachmentNames?: string[] }) =>
    apiFetch<{ message: string; ticket: any }>('/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  addMessage: (ticketId: string, body: string, isAiDraftBased = false) =>
    apiFetch<{ message: string; ticketMessage: any }>(`/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ body, isAiDraftBased }),
    }),
  patchTicket: (ticketId: string, updates: { status?: string; category?: string; priority?: string; assignedAdminId?: string | null }) =>
    apiFetch<{ message: string; ticket: any }>(`/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  assignTicket: (ticketId: string, unassign = false) =>
    apiFetch<{ message: string; ticket: any }>(`/tickets/${ticketId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ unassign }),
    }),

  // Internal Notes (Admin)
  getInternalNotes: (ticketId: string) =>
    apiFetch<{ notes: any[] }>(`/tickets/${ticketId}/notes`),
  addInternalNote: (ticketId: string, body: string) =>
    apiFetch<{ message: string; note: any }>(`/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    }),

  // AI Operations (Admin)
  getAiDraft: (ticketId: string) =>
    apiFetch<{ draft: any }>(`/tickets/${ticketId}/draft`),
  regenerateAiDraft: (ticketId: string) =>
    apiFetch<{ draft: any }>(`/tickets/${ticketId}/draft/regenerate`, {
      method: 'POST',
    }),
  reclassifyTicket: (ticketId: string) =>
    apiFetch<{ message: string; result: any }>(`/tickets/${ticketId}/reclassify`, {
      method: 'POST',
    }),

  // Admin Metrics
  getAdminStats: () => apiFetch<{ stats: any }>('/admin/stats'),
};
