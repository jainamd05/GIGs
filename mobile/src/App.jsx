import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';
import { Toast } from './ui.jsx';
import {
  IconClipboard, IconUsers, IconUser, IconWrench, IconBriefcase, IconChart,
} from './icons.jsx';
import Auth from './screens/Auth.jsx';
import CustomerNewGig from './screens/customer/NewGig.jsx';
import CustomerInterested from './screens/customer/Interested.jsx';
import CustomerAccount from './screens/customer/Account.jsx';
import WorkerJobs from './screens/worker/Jobs.jsx';
import WorkerMyWork from './screens/worker/MyWork.jsx';
import WorkerProfile from './screens/worker/Profile.jsx';
import AdminScreen from './screens/Admin.jsx';

const REFRESH_MS = 4000;

const NAV_BY_ROLE = {
  customer: [
    { id: 'new', label: 'New Gig', icon: IconClipboard, Screen: CustomerNewGig },
    { id: 'interested', label: 'Interested', icon: IconUsers, Screen: CustomerInterested },
    { id: 'account', label: 'Account', icon: IconUser, Screen: CustomerAccount },
  ],
  worker: [
    { id: 'jobs', label: 'Jobs', icon: IconWrench, Screen: WorkerJobs },
    { id: 'mywork', label: 'My Work', icon: IconBriefcase, Screen: WorkerMyWork },
    { id: 'profile', label: 'Profile', icon: IconUser, Screen: WorkerProfile },
  ],
  admin: [
    { id: 'dashboard', label: 'Dashboard', icon: IconChart, Screen: AdminScreen },
  ],
};

export default function App() {
  const { user, worker, loading, logout } = useAuth();
  const [nav, setNav] = useState(null);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [health, setHealth] = useState(null);
  const toastTimer = useRef();

  const bump = useCallback(() => setTick((t) => t + 1), []);
  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    const i = setInterval(bump, REFRESH_MS);
    return () => clearInterval(i);
  }, [bump]);
  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ error: true }));
  }, [tick]);

  const navItems = user ? NAV_BY_ROLE[user.role] || [] : [];
  // Reset the active tab whenever the signed-in role changes.
  useEffect(() => {
    setNav(navItems[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.userId]);

  const ctx = useMemo(
    () => ({ tick, bump, notify, user, worker, logout }),
    [tick, bump, notify, user, worker, logout]
  );
  const online = health && !health.error;
  const clock = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const Active = navItems.find((n) => n.id === nav)?.Screen || navItems[0]?.Screen;

  return (
    <div className="flex min-h-screen items-center justify-center p-0 sm:p-6">
      <div className="relative flex h-[100dvh] w-full max-w-[430px] flex-col overflow-hidden bg-slate-50 sm:h-[calc(100dvh-3rem)] sm:max-h-[900px] sm:min-h-[620px] sm:rounded-[2.25rem] sm:border-8 sm:border-ink-900 sm:shadow-pop">
        {/* faux status bar */}
        <div className="flex items-center justify-between bg-slate-50 px-6 pt-2 text-[11px] font-semibold text-slate-500">
          <span>{clock}</span>
          <span className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-accent-500' : 'bg-rose-500'}`} />
            {online ? 'live' : 'offline'}
          </span>
        </div>

        {/* screens */}
        <div className="noscroll relative flex-1 overflow-y-auto overscroll-contain">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm font-bold text-slate-400">Loading…</div>
          ) : !user ? (
            <Auth />
          ) : Active ? (
            <Active ctx={ctx} health={health} />
          ) : null}
        </div>

        {/* bottom nav — only when signed in and there is more than one tab */}
        {user && navItems.length > 1 && (
          <nav
            className="grid shrink-0 border-t border-slate-200 bg-white/95 px-2 pb-2 pt-1.5 backdrop-blur"
            style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
          >
            {navItems.map((n) => {
              const Icon = n.icon;
              const on = nav === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setNav(n.id)}
                  className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[10px] font-bold transition-colors ${
                    on ? 'text-brand-600' : 'text-slate-400'
                  }`}
                >
                  <Icon size={19} />
                  {n.label}
                </button>
              );
            })}
          </nav>
        )}

        <Toast toast={toast} />
      </div>
    </div>
  );
}
