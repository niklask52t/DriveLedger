import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api, ApiError } from '../api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string, registrationToken: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Try to restore session on mount, or handle OIDC callback token
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Check for OIDC token in URL hash (e.g. /#login?oidc_token=xxx)
        const hash = window.location.hash;
        const oidcMatch = hash.match(/[?&]oidc_token=([^&]+)/);
        if (oidcMatch) {
          const token = decodeURIComponent(oidcMatch[1]);
          // Clean up the URL
          window.location.hash = hash.replace(/[?&]oidc_token=[^&]+/, '').replace(/\?$/, '');
          api.setToken(token);
          if (!cancelled) {
            const me = await api.getMe();
            setUser(me);
          }
        } else {
          const refreshed = await api.refresh();
          if (refreshed && !cancelled) {
            const me = await api.getMe();
            setUser(me);
          }
        }
      } catch {
        // Not logged in
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string, registrationToken: string) => {
    const data = await api.register(email, username, password, registrationToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.getMe();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      }
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
