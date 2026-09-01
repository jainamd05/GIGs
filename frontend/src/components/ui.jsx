import { IconStar, IconCheck, IconAlert, IconInfo } from './icons.jsx';

// ---------------------------------------------------------------------------
// Status chip — small coloured pill with a leading dot
// ---------------------------------------------------------------------------
const STATUS_STYLES = {
  OPEN: 'bg-amber-100 text-amber-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-brand-100 text-brand-700',
  CANCELLED: 'bg-slate-200 text-slate-600',
  INTERESTED: 'bg-amber-100 text-amber-800',
  HIRED: 'bg-brand-100 text-brand-700',
  RELEASED: 'bg-slate-200 text-slate-600',
  Available: 'bg-brand-100 text-brand-700',
  Busy: 'bg-rose-100 text-rose-700',
};
const DOT_STYLES = {
  OPEN: 'bg-amber-500',
  ASSIGNED: 'bg-blue-500',
  COMPLETED: 'bg-brand-500',
  INTERESTED: 'bg-amber-500',
  HIRED: 'bg-brand-500',
  Available: 'bg-brand-500',
  Busy: 'bg-rose-500',
};

const LABELS = {
  OPEN: 'Open',
  ASSIGNED: 'Assigned',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  INTERESTED: 'Interested',
  HIRED: 'Hired',
  RELEASED: 'Released',
};

export function StatusChip({ status }) {
  return (
    <span className={`chip ${STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_STYLES[status] || 'bg-slate-400'}`} />
      {LABELS[status] || status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Form field — label, optional hint, input / select
// ---------------------------------------------------------------------------
export function Field({ label, hint, options, className = '', ...props }) {
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      {options ? (
        <select className="field" {...props}>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input className={`field ${className}`} {...props} />
      )}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Section title + optional trailing content
// ---------------------------------------------------------------------------
export function SectionTitle({ children, right, icon: Icon }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        {Icon && <Icon size={15} className="text-slate-400" />}
        {children}
      </h2>
      {right}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
export function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
      {Icon && <Icon size={22} className="text-slate-300" />}
      <p className="text-sm font-medium text-slate-500">{title}</p>
      {hint && <p className="max-w-xs text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Star rating — read-only display or interactive input
// ---------------------------------------------------------------------------
export function Stars({ value = 0, onChange, size = 14 }) {
  const interactive = typeof onChange === 'function';
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!interactive}
          onClick={interactive ? () => onChange(n) : undefined}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform ${
            n <= Math.round(value) ? 'text-amber-400' : 'text-slate-300'
          }`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <IconStar size={size} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
        </button>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Avatar — initials on a deterministic colour
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  'bg-brand-100 text-brand-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-purple-100 text-purple-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
];
export function Avatar({ name = '?', size = 36 }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const color = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-semibold ${color}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
export function Toast({ toast }) {
  if (!toast) return null;
  const error = toast.type === 'error';
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:pr-6">
      <div
        className={`pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm text-white shadow-pop animate-toast-in ${
          error ? 'bg-rose-600' : 'bg-slate-900'
        }`}
        role="status"
      >
        <span className="mt-0.5 shrink-0">{error ? <IconAlert size={16} /> : <IconCheck size={16} />}</span>
        <span className="leading-snug">{toast.msg}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline info / warning banner
// ---------------------------------------------------------------------------
export function Banner({ tone = 'info', children }) {
  const tones = {
    info: 'border-blue-200 bg-blue-50 text-blue-800',
    warn: 'border-amber-200 bg-amber-50 text-amber-800',
    error: 'border-rose-200 bg-rose-50 text-rose-800',
  };
  const Icon = tone === 'info' ? IconInfo : IconAlert;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${tones[tone]}`}>
      <Icon size={14} className="mt-0.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Relative time (e.g. "3m ago")
// ---------------------------------------------------------------------------
export function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 45) return 'just now';
  if (d < 90) return '1m ago';
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 5400) return '1h ago';
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}
