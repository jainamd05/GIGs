import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, StatusChip } from './ui.jsx';

const SERVICE_TYPES = ['Plumbing', 'Electrician', 'Cleaning', 'Carpentry'];
const LS_KEY = 'sahayak.customer';

export default function CustomerView({ ctx }) {
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  });
  const [form, setForm] = useState({
    serviceType: 'Plumbing', location: 'Rajkot', description: '', preferredTime: '',
  });
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);

  const saveMe = (next) => {
    setMe(next);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!me.customerName) return;
    api.jobs(`?customer=${encodeURIComponent(me.customerName)}`).then((d) => setJobs(d.jobs)).catch(() => {});
  }, [me.customerName, ctx.tick]);

  const submit = async (e) => {
    e.preventDefault();
    if (!me.customerName || !me.customerContact) return ctx.notify('Enter your name and contact first', 'error');
    setBusy(true);
    try {
      const r = await api.createGig({ ...me, ...form });
      ctx.notify(`Request ${r.jobId} sent to ${r.eligibleCount} worker(s)`);
      setForm({ ...form, description: '', preferredTime: '' });
      ctx.bump();
    } catch (err) {
      ctx.notify(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-4">
        <div className="card space-y-3">
          <h2 className="font-semibold">Your details</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" value={me.customerName || ''} onChange={(e) => saveMe({ ...me, customerName: e.target.value })} />
            <Field label="Contact (phone)" value={me.customerContact || ''} onChange={(e) => saveMe({ ...me, customerContact: e.target.value })} />
          </div>
          <Field label="Email (optional)" value={me.customerEmail || ''} onChange={(e) => saveMe({ ...me, customerEmail: e.target.value })} />
        </div>

        <form onSubmit={submit} className="card space-y-3">
          <h2 className="font-semibold">New service request</h2>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service" options={SERVICE_TYPES} value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} />
            <Field label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <Field label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label="Preferred time" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} />
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Submit request'}</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Your requests</h2>
        {!me.customerName && <p className="text-sm text-slate-500">Enter your name to see your requests.</p>}
        {me.customerName && jobs.length === 0 && <p className="text-sm text-slate-500">No requests yet.</p>}
        {jobs.map((j) => <JobCard key={j.jobId} job={j} ctx={ctx} />)}
      </section>
    </div>
  );
}

function JobCard({ job, ctx }) {
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(job.jobStatus === 'OPEN' || job.jobStatus === 'ASSIGNED');

  useEffect(() => {
    if (!open) return;
    api.job(job.jobId).then(setDetail).catch(() => {});
  }, [open, job.jobId, ctx.tick]);

  const hire = async (workerId) => {
    try {
      const r = await api.customerHire(job.jobId, workerId);
      ctx.notify(`Hired ${r.workerName}`);
      ctx.bump();
    } catch (e) { ctx.notify(e.message, 'error'); }
  };
  const act = async (fn, label) => {
    try { await fn(); ctx.notify(label); ctx.bump(); }
    catch (e) { ctx.notify(e.message, 'error'); }
  };

  const interests = detail?.interests || [];
  const assigned = interests.find((i) => i.status === 'HIRED');

  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{job.serviceType}</span>{' '}
          <span className="text-sm text-slate-500">· {job.location}</span>
        </div>
        <StatusChip status={job.jobStatus} />
      </div>
      <div className="text-xs text-slate-500">{job.jobId} · {new Date(job.createdAt).toLocaleString()}</div>
      {job.description && <p className="text-sm">{job.description}</p>}

      <button className="text-xs text-brand-700 hover:underline" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide details' : 'Show details'}
      </button>

      {open && (
        <div className="space-y-2 border-t border-slate-100 pt-2">
          {job.jobStatus === 'OPEN' && (
            <>
              <div className="text-xs font-medium text-slate-600">Interested workers ({interests.length})</div>
              {interests.length === 0 && <p className="text-xs text-slate-400">Waiting for workers to respond…</p>}
              {interests.map((i) => (
                <div key={i.workerId} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-sm">
                    {i.workerName}{' '}
                    <span className="text-xs text-slate-500">
                      ★{i.rating} · {i.recentJobs} jobs · {i.location}
                    </span>
                  </div>
                  <button className="btn-primary py-1" onClick={() => hire(i.workerId)}>Hire</button>
                </div>
              ))}
            </>
          )}

          {job.jobStatus === 'ASSIGNED' && assigned && (
            <div className="space-y-2">
              <div className="rounded-lg bg-brand-50 px-3 py-2 text-sm">
                Assigned to <b>{assigned.workerName}</b> ({assigned.phoneno})
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn-ghost py-1" onClick={() => act(() => api.jobComplete(job.jobId), 'Marked complete')}>
                  Mark complete
                </button>
                <button className="btn-ghost py-1" onClick={() => act(() => api.paymentComplete(job.jobId, 450, 'UPI'), 'Payment recorded (₹450)')}>
                  Pay ₹450
                </button>
                <button className="btn-ghost py-1" onClick={() => act(() => api.ratingSubmit(job.jobId, assigned.workerId, 5, 'Great work'), 'Rated 5★')}>
                  Rate 5★
                </button>
              </div>
            </div>
          )}

          {job.jobStatus === 'COMPLETED' && assigned && (
            <div className="text-sm text-slate-600">Completed by {assigned.workerName}.</div>
          )}
        </div>
      )}
    </div>
  );
}
