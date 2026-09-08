import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchCurrentAdmin, loginAdmin, logoutAdmin } from '../api/authService';
import { getStoredToken } from '../api/client';
import type { AdminAccount } from '../types';

type AuthContextValue = {
  admin: AdminAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSuperAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAdmin = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setAdmin(null);
      return;
    }

    try {
      const current = await fetchCurrentAdmin();
      setAdmin(current);
    } catch {
      setAdmin(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        await refreshAdmin();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshAdmin]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginAdmin(email, password);
    setAdmin(response.user);
  }, []);

  const logout = useCallback(async () => {
    await logoutAdmin();
    setAdmin(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      isLoading,
      isSuperAdmin: Boolean(admin?.is_super_admin),
      login,
      logout,
      refreshAdmin,
    }),
    [admin, isLoading, login, logout, refreshAdmin],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
