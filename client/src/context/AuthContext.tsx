import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, getAuthToken, setAuthToken, type AuthUser } from '../lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  hasRole: (...roles: AuthUser['role'][]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Restore the session on load, if a token exists.
  useEffect(() => {
    if (!getAuthToken()) {
      setReady(true);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => setAuthToken(null))
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      ready,
      login: async (email, password) => {
        const res = await api.login(email, password);
        setAuthToken(res.token);
        setUser(res.user);
        return res.user;
      },
      register: async (name, email, password) => {
        const res = await api.register(name, email, password);
        setAuthToken(res.token);
        setUser(res.user);
        return res.user;
      },
      logout: () => {
        setAuthToken(null);
        setUser(null);
      },
      hasRole: (...roles) => (user ? roles.includes(user.role) : false),
    }),
    [user, ready],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
