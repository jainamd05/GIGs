import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { Toast } from './components/ui.jsx';
import { IconUser, IconWrench, IconChart, IconBell, IconRefresh } from './components/icons.jsx';
import CustomerView from './components/CustomerView.jsx';
import WorkerView from './components/WorkerView.jsx';
import AdminView from './components/AdminView.jsx';

const TABS = [
  { id: 'customer', label: 'Customer', icon: IconUser, blurb: 'Request a service' },
  { id: 'worker', label: 'Worker', icon: IconWrench, blurb: 'Find & accept jobs' },
  { id: 'admin', label: 'Admin', icon: IconChart, blurb: 'Dashboard & activity' },
];

const REFRESH_MS = 4000;

export default function App() {
  const [tab, setTab] = useState('customer');
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [health, setHealth] = useState(null);
  const toastTimer = useRef();

  const bump = useCallback(() => setTick((t) => t + 1), []);

  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  // auto-refresh so cross-role actions show up live
  useEffect(() => {
    const i = setInterval(bump, REFRESH_MS);
    return () => clearInterval(i);
  }, [bump]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ error: true }));
  }, [tick]);

  const ctx = useMemo(() => ({ tick, bump, notify }), [tick, bump, notify]);
  const online = health && !health.error;
  const active = TABS.find((t) => t.id === tab);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-grad-brand font-display font-bold text-white shadow-sm">S</div>
              <div>
                <div className="text-[15px] font-semibold leading-tight text-slate-900">Sahayak</div>
                <div className="text-[11px] leading-tight text-slate-500">Cooperative gig-worker matching</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {online && (
                <span
                  className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500 sm:flex"
                  title="Notification channels"
                >
                  <IconBell size={12} />
                  {['email', 'sms', 'whatsapp'].map((k) => (
                    <span key={k} className={health.integrations[k] === 'live' ? 'text-brand-700' : ''}>
                      {k === 'whatsapp' ? 'wa' : k}:{health.integrations[k] === 'live' ? 'live' : 'sim'}
                    </span>
                  ))}
                </span>
              )}
              <span
                className={`chip ${health?.error ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'}`}
                title={online ? `Backend at ${api.base}` : 'Backend unreachable'}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${health?.error ? 'bg-rose-500' : 'bg-brand-500 animate-pulse'}`} />
                {health?.error ? 'offline' : 'live'}
              </span>
            </div>
          </div>

          <nav className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon;
              const selected = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
                    selected
                      ? 'border-brand-600 text-brand-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon size={15} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{active.label}</h1>
            <p className="text-sm text-slate-500">{active.blurb}</p>
          </div>
          <span className="hidden items-center gap-1 text-[11px] text-slate-400 sm:flex">
            <IconRefresh size={12} /> auto-refresh
          </span>
        </div>

        {health?.error && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <div>
              Cannot reach the backend at <code className="rounded bg-rose-100 px-1">{api.base}</code>. Start it with{' '}
              <code className="rounded bg-rose-100 px-1">cd backend &amp;&amp; npm start</code>.
            </div>
          </div>
        )}

        <div className="animate-fade-in" key={tab}>
          {tab === 'customer' && <CustomerView ctx={ctx} />}
          {tab === 'worker' && <WorkerView ctx={ctx} />}
          {tab === 'admin' && <AdminView ctx={ctx} />}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-[11px] text-slate-400">
        Sahayak · offline demo · data refreshes every {REFRESH_MS / 1000}s
      </footer>

      <Toast toast={toast} />
    </div>
  );
}
