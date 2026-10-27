import { create } from 'zustand';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AUTHOR';
  authorId?: string;
  authorCode?: string;
  author?: any;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  switchUser: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: true,
  error: null,

  initialize: async () => {
    if (typeof window === 'undefined') return;

    const savedToken = localStorage.getItem('bookleaf_token');
    if (!savedToken) {
      set({ token: null, user: null, loading: false });
      return;
    }

    set({ token: savedToken, loading: true });
    try {
      const res = await api.getMe();
      set({ user: res.user, loading: false, error: null });
    } catch (_err) {
      localStorage.removeItem('bookleaf_token');
      set({ token: null, user: null, loading: false });
    }
  },

  login: async (email: string, password = 'Author@123') => {
    set({ error: null });
    const pwd =
      password ||
      (email.includes('admin') || email.includes('support') ? 'Admin@123' : 'Author@123');

    try {
      const res = await api.login(email, pwd);
      if (typeof window !== 'undefined') {
        localStorage.setItem('bookleaf_token', res.token);
      }
      set({ token: res.token, user: res.user, error: null });
    } catch (err: any) {
      const message = err.message || 'Login failed';
      set({ error: message });
      throw err;
    }
  },

  switchUser: async (email: string) => {
    const pwd =
      email.includes('admin') || email.includes('support') ? 'Admin@123' : 'Author@123';
    await get().login(email, pwd);
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (_e) {
      // Ignore network error on logout
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bookleaf_token');
    }
    set({ token: null, user: null, error: null });
  },

  clearError: () => set({ error: null }),
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
}));
