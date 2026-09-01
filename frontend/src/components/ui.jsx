export function StatusChip({ status }) {
  const map = {
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
  return <span className={`chip ${map[status] || 'bg-slate-100 text-slate-600'}`}>{status}</span>;
}

export function Field({ label, ...props }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {props.options ? (
        <select className="field" {...props}>
          {props.options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input className="field" {...props} />
      )}
    </label>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
        toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
      }`}
    >
      {toast.msg}
    </div>
  );
}
