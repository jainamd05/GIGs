import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { Toast } from './components/ui.jsx';
import CustomerView from './components/CustomerView.jsx';
import WorkerView from './components/WorkerView.jsx';
import AdminView from './components/AdminView.jsx';

const TABS = [
  { id: 'customer', label: 'Customer' },
  { id: 'worker', label: 'Worker' },
  { id: 'admin', label: 'Admin' },
];

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

  // auto-refresh every 4s so cross-role actions show up live
  useEffect(() => {
    const i = setInterval(bump, 4000);
    return () => clearInterval(i);
  }, [bump]);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth({ error: true }));
  }, [tick]);

  const ctx = useMemo(() => ({ tick, bump, notify }), [tick, bump, notify]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white font-bold">S</div>
            <div>
              <div className="font-semibold leading-tight">Sahayak</div>
              <div className="text-[11px] text-slate-500 leading-tight">Cooperative gig-worker matching</div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            {health && !health.error && (
              <span title="notification channels">
                email:{health.integrations.email} · sms:{health.integrations.sms} · wa:{health.integrations.whatsapp}
              </span>
            )}
            <span className={`chip ${health?.error ? 'bg-rose-100 text-rose-700' : 'bg-brand-100 text-brand-700'}`}>
              {health?.error ? 'backend offline' : 'backend live'}
            </span>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t.id
                  ? 'border-brand-600 text-brand-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {health?.error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            Cannot reach the backend at <code>{api.base}</code>. Start it with{' '}
            <code>cd backend && npm start</code>.
          </div>
        )}
        {tab === 'customer' && <CustomerView ctx={ctx} />}
        {tab === 'worker' && <WorkerView ctx={ctx} />}
        {tab === 'admin' && <AdminView ctx={ctx} />}
      </main>

      <Toast toast={toast} />
    </div>
  );
}
