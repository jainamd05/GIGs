import { IconStar, IconCheck, IconAlert, IconInfo, IconShield, IconArrowRight, IconX } from './icons.jsx';
import { fairWage, matchScore, coopId, yearsExp, STAGES } from './lib.js';

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------
const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-800', ASSIGNED: 'bg-brand-100 text-brand-700',
  COMPLETED: 'bg-accent-100 text-accent-700', CANCELLED: 'bg-slate-200 text-slate-600',
  INTERESTED: 'bg-amber-100 text-amber-800', HIRED: 'bg-accent-100 text-accent-700',
  RELEASED: 'bg-slate-200 text-slate-600', Available: 'bg-accent-100 text-accent-700', Busy: 'bg-rose-100 text-rose-700',
};
const DOT = {
  OPEN: 'bg-amber-500', ASSIGNED: 'bg-brand-500', COMPLETED: 'bg-accent-500',
  INTERESTED: 'bg-amber-500', HIRED: 'bg-accent-500', Available: 'bg-accent-500', Busy: 'bg-rose-500',
};
const LABELS = {
  OPEN: 'Finding worker', ASSIGNED: 'Assigned', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  INTERESTED: 'Interested', HIRED: 'Hired', RELEASED: 'Released',
};
export function StatusChip({ status }) {
  return (
    <span className={`chip ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT[status] || 'bg-slate-400'}`} />
      {LABELS[status] || status}
    </span>
  );
}

// ---------------------------------------------------------------------------
export function Field({ label, hint, options, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {options ? (
        <select className="field" {...props}>{options.map((o) => <option key={o} value={o}>{o}</option>)}</select>
      ) : (
        <input className={`field ${className}`} {...props} />
      )}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
export function Stars({ value = 0, onChange, size = 15 }) {
  const interactive = typeof onChange === 'function';
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" disabled={!interactive}
          onClick={interactive ? () => onChange(n) : undefined}
          className={`transition-transform ${interactive ? 'active:scale-90' : ''} ${n <= Math.round(value) ? 'text-amber-400' : 'text-slate-300'}`}
          aria-label={`${n} stars`}
        >
          <IconStar size={size} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700',
  'bg-accent-100 text-accent-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700',
];
export function Avatar({ name = '?', size = 40 }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl font-bold ${AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
      {Icon && <Icon size={22} className="text-slate-300" />}
      <p className="text-sm font-bold text-slate-500">{title}</p>
      {hint && <p className="max-w-[16rem] text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Banner({ tone = 'info', children }) {
  const tones = {
    info: 'border-brand-200 bg-brand-50 text-brand-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  const Icon = tone === 'info' ? IconInfo : IconAlert;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${tones[tone]}`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Toast({ toast }) {
  if (!toast) return null;
  const error = toast.type === 'error';
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center px-6">
      <div className={`pointer-events-auto flex max-w-full items-start gap-2.5 rounded-2xl px-4 py-3 text-sm text-white shadow-pop animate-toast-in ${error ? 'bg-rose-600' : 'bg-ink-800'}`}>
        <span className="mt-0.5 shrink-0">{error ? <IconAlert size={15} /> : <IconCheck size={15} />}</span>
        <span className="leading-snug">{toast.msg}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-screen sheet inside the phone shell
// ---------------------------------------------------------------------------
export function Sheet({ children, onClose }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-slate-50 animate-sheet-up">
      <div className="noscroll flex-1 overflow-y-auto overscroll-contain">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-white backdrop-blur"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  );
}

export function SheetHeader({ eyebrow, title, subtitle, icon: Icon, variant = 'brand' }) {
  const bg = variant === 'ink' ? 'bg-grad-ink' : 'bg-grad-brand';
  return (
    <div className={`${bg} px-5 pb-5 pt-5 text-white`}>
      <div className="flex items-start gap-2.5">
        {Icon && <span className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-white/15"><Icon size={17} /></span>}
        <div className="pr-10">
          {eyebrow && <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">{eyebrow}</div>}
          <div className="font-display text-lg font-semibold leading-tight">{title}</div>
          {subtitle && <div className="text-xs text-white/80">{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export function Stepper({ current = 0, steps = STAGES }) {
  return (
    <div className="flex items-start">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={label} className="flex flex-1 flex-col items-center">
            <div className="flex w-full items-center">
              <span className={`h-0.5 flex-1 ${i === 0 ? 'opacity-0' : done || active ? 'bg-brand-500' : 'bg-slate-200'}`} />
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                done ? 'bg-accent-500 text-white' : active ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-slate-100 text-slate-400'
              }`}>
                {done ? <IconCheck size={13} /> : i + 1}
              </span>
              <span className={`h-0.5 flex-1 ${i === steps.length - 1 ? 'opacity-0' : done ? 'bg-brand-500' : 'bg-slate-200'}`} />
            </div>
            <span className={`mt-1.5 text-[10px] font-semibold ${active ? 'text-brand-700' : done ? 'text-slate-600' : 'text-slate-400'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function FairWageCard({ service, worker, bookingId }) {
  const w = fairWage(service, worker);
  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-bold text-brand-800"><IconShield size={14} /> Fair Wage Breakdown</span>
          {bookingId && <span className="font-mono text-[11px] text-slate-400">ID: {bookingId}</span>}
        </div>
        <dl className="space-y-1.5 text-sm">
          {w.lines.map((l) => (
            <div key={l.label} className="flex items-center justify-between">
              <dt className="text-slate-600">{l.label}</dt>
              <dd className={`font-mono font-bold ${l.add ? 'text-brand-600' : 'text-slate-800'}`}>{l.add ? '+ ' : ''}₹{l.value}</dd>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-brand-100 pt-2">
            <dt className="font-bold text-slate-800">Total Guaranteed Price</dt>
            <dd className="font-mono text-base font-bold text-brand-700">₹{w.total}</dd>
          </div>
        </dl>
        <div className="mt-2 space-y-1 border-t border-brand-100 pt-2 text-[11px] text-slate-500">
          {w.pools.map((p) => (
            <div key={p.label} className="flex justify-between"><span>• {p.label}</span><span className="font-mono text-accent-600">₹{p.value}</span></div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl bg-grad-ink px-4 py-3 text-white">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Total transparent rate</div>
          <div className="text-[11px] text-white/70">Guaranteed rate · no hidden costs</div>
        </div>
        <div className="font-mono text-2xl font-bold text-brand-300">₹{w.total}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
export const PAYMENT_METHODS = [
  { id: 'UPI', label: 'BHIM / UPI' },
  { id: 'Card', label: 'Card' },
  { id: 'Cash', label: 'Cash on Job' },
];
export function PaymentMethods({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {PAYMENT_METHODS.map((m) => (
        <button
          key={m.id} type="button" onClick={() => onChange(m.id)}
          className={`rounded-2xl border px-2 py-3 text-xs font-bold transition-colors ${
            value === m.id ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-glow' : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
export function WorkerMatchCard({ worker, job, top, action, note }) {
  const score = matchScore(worker, job);
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-card ${top ? 'border-accent-400 ring-1 ring-accent-200' : 'border-slate-200'}`}>
      {top && (
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-700">
          <IconStar size={11} fill="currentColor" /> AI top recommended
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <Avatar name={worker.workerName || worker.name} size={46} />
          <div>
            <div className="flex items-center gap-1 font-bold text-slate-800">
              {worker.workerName || worker.name}<IconShield size={13} className="text-brand-500" />
            </div>
            <div className="text-xs text-slate-500">{worker.skill || job.serviceType}</div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-0.5 font-bold text-amber-500">
                <IconStar size={11} fill="currentColor" />{Number(worker.rating ?? 4.5).toFixed(1)}
              </span>
              <span>· {yearsExp(worker)} yrs</span>
              <span>· {worker.location}</span>
            </div>
          </div>
        </div>
        <span className="chip shrink-0 bg-accent-100 text-accent-700">{score}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="chip bg-brand-50 text-brand-700"><IconShield size={11} />{coopId(worker)}</span>
        <span className="chip bg-accent-50 text-accent-700">Member Verified</span>
        <span className="chip bg-amber-50 text-amber-700">₹5L Insured</span>
      </div>
      <div className="mt-3">{action || (note && <p className="text-center text-xs text-slate-400">{note}</p>)}</div>
    </div>
  );
}

export { IconArrowRight };
