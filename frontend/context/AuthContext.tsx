'use client';

import React, { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { User } from '../store/useAuthStore';

export type { User };

/**
 * Backward compatibility adapter:
 * Components can continue to import useAuth / AuthProvider or use useAuthStore directly.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return <>{children}</>;
}

export const useAuth = () => {
  const { user, token, loading, login, logout, switchUser, error, clearError } = useAuthStore();
  return {
    user,
    token,
    loading,
    error,
    login,
    logout,
    switchUser,
    clearError,
  };
};
