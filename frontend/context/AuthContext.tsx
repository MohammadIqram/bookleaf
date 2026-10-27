'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'AUTHOR';
  authorId?: string;
  authorCode?: string;
  author?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('bookleaf_token');
    if (savedToken) {
      setToken(savedToken);
      api
        .getMe()
        .then((res) => {
          setUser(res.user);
        })
        .catch(() => {
          localStorage.removeItem('bookleaf_token');
          setToken(null);
          setUser(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password = 'Author@123') => {
    // If admin email, use Admin@123 if not explicitly provided
    const pwd = password || (email.includes('admin') || email.includes('support') ? 'Admin@123' : 'Author@123');
    const res = await api.login(email, pwd);

    localStorage.setItem('bookleaf_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const switchUser = async (email: string) => {
    const pwd = email.includes('admin') || email.includes('support') ? 'Admin@123' : 'Author@123';
    await login(email, pwd);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (_e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('bookleaf_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, switchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
