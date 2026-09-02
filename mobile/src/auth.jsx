import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, clearToken } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState({ user: null, worker: null });
  const [loading, setLoading] = useState(Boolean(getToken()));

  const loadMe = useCallback(async () => {
    if (!getToken()) { setSession({ user: null, worker: null }); setLoading(false); return; }
    setLoading(true);
    try {
      const { user, worker } = await api.authMe();
      setSession({ user, worker: worker || null });
    } catch {
      clearToken();
      setSession({ user: null, worker: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  useEffect(() => {
    const onLogout = () => setSession({ user: null, worker: null });
    window.addEventListener('sahayak:logout', onLogout);
    return () => window.removeEventListener('sahayak:logout', onLogout);
  }, []);

  const signIn = useCallback((token, user, worker) => {
    setToken(token);
    setSession({ user, worker: worker || null });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setSession({ user: null, worker: null });
  }, []);

  const refresh = loadMe;

  const value = useMemo(
    () => ({ ...session, loading, signIn, logout, refresh }),
    [session, loading, signIn, logout, refresh]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
