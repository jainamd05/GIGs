import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, StatusChip, SectionTitle, EmptyState, Stars, Avatar, Banner, timeAgo } from './ui.jsx';
import {
  IconUser, IconPlus, IconBriefcase, IconChevron, IconMapPin, IconClock, IconCheck, IconRupee, IconStar,
} from './icons.jsx';

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

  const identified = me.customerName && me.customerContact;

  const submit = async (e) => {
    e.preventDefault();
    if (!identified) return ctx.notify('Enter your name and contact first', 'error');
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

  const active = jobs.filter((j) => j.jobStatus === 'OPEN' || j.jobStatus === 'ASSIGNED');
  const past = jobs.filter((j) => j.jobStatus === 'COMPLETED' || j.jobStatus === 'CANCELLED');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <section className="space-y-4">
        <div className="card space-y-3">
          <SectionTitle icon={IconUser} right={identified && <span className="chip bg-brand-100 text-brand-700"><IconCheck size={12} />saved</span>}>
            Your details
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" placeholder="e.g. Anita Shah" value={me.customerName || ''} onChange={(e) => saveMe({ ...me, customerName: e.target.value })} />
            <Field label="Phone" placeholder="10-digit number" value={me.customerContact || ''} onChange={(e) => saveMe({ ...me, customerContact: e.target.value })} />
          </div>
          <Field label="Email" hint="Optional — used for notifications" placeholder="you@example.com" value={me.customerEmail || ''} onChange={(e) => saveMe({ ...me, customerEmail: e.target.value })} />
          {!identified && <Banner tone="warn">Add your name and phone to submit a request. Details are stored on this device only.</Banner>}
        </div>

        <form onSubmit={submit} className="card space-y-3">
          <SectionTitle icon={IconPlus}>New service request</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Service" options={SERVICE_TYPES} value={form.serviceType} onChange={(e) => setForm({ ...form, serviceType: e.target.value })} />
            <Field label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <Field label="Description" hint="What needs doing?" placeholder="e.g. Kitchen tap is leaking" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label="Preferred time" placeholder="e.g. Tomorrow morning" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} />
          <button className="btn-primary w-full" disabled={busy || !identified}>
            {busy ? 'Sending…' : 'Submit request'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={IconBriefcase} right={jobs.length > 0 && <span className="text-xs text-slate-400">{jobs.length} total</span>}>
          Your requests
        </SectionTitle>

        {!me.customerName && (
          <EmptyState icon={IconUser} title="No requests yet" hint="Enter your name on the left to load your requests." />
        )}
        {me.customerName && jobs.length === 0 && (
          <EmptyState icon={IconBriefcase} title="No requests yet" hint="Submit your first service request using the form." />
        )}

        {active.map((j) => <JobCard key={j.jobId} job={j} ctx={ctx} />)}

        {past.length > 0 && (
          <>
            <p className="section-title pt-2">History</p>
            {past.map((j) => <JobCard key={j.jobId} job={j} ctx={ctx} defaultOpen={false} />)}
          </>
        )}
      </section>
    </div>
  );
}

function JobCard({ job, ctx, defaultOpen }) {
  const [detail, setDetail] = useState(null);
  const [open, setOpen] = useState(
    defaultOpen ?? (job.jobStatus === 'OPEN' || job.jobStatus === 'ASSIGNED')
  );
  const [amount, setAmount] = useState(450);
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (!open) return;
    api.job(job.jobId).then(setDetail).catch(() => {});
  }, [open, job.jobId, ctx.tick]);

  const hire = async (worker) => {
    if (!window.confirm(`Hire ${worker.workerName}? Other applicants will be released.`)) return;
    try {
      const r = await api.customerHire(job.jobId, worker.workerId);
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
  const paid = (detail?.payments || []).reduce((s, p) => s + p.amount, 0);
  const rated = (detail?.ratings || [])[0];

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-900">{job.serviceType}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500"><IconMapPin size={12} />{job.location}</span>
          </div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {job.jobId} · {timeAgo(job.createdAt)}
          </div>
        </div>
        <StatusChip status={job.jobStatus} />
      </div>

      {job.description && <p className="text-sm text-slate-600">{job.description}</p>}

      <button
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        onClick={() => setOpen((o) => !o)}
      >
        <IconChevron size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide details' : 'Show details'}
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          {job.jobStatus === 'OPEN' && (
            <>
              <p className="section-title">Interested workers ({interests.length})</p>
              {interests.length === 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  <IconClock size={14} /> Waiting for workers to respond…
                </div>
              )}
              {interests.map((i) => (
                <div key={i.workerId} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={i.workerName} size={34} />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">{i.workerName}</div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                        <Stars value={i.rating} size={11} />
                        <span>{Number(i.rating).toFixed(1)}</span>
                        <span>· {i.recentJobs} jobs · {i.location}</span>
                      </div>
                    </div>
                  </div>
                  <button className="btn-primary btn-sm" onClick={() => hire(i)}>Hire</button>
                </div>
              ))}
            </>
          )}

          {job.jobStatus === 'ASSIGNED' && assigned && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 rounded-lg bg-brand-50 px-3 py-2.5">
                <Avatar name={assigned.workerName} size={34} />
                <div className="text-sm">
                  <div className="font-medium text-brand-900">{assigned.workerName}</div>
                  <div className="text-xs text-brand-700">{assigned.phoneno}</div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  className="btn-ghost btn-sm w-full"
                  onClick={() => act(() => api.jobComplete(job.jobId), 'Marked complete')}
                >
                  <IconCheck size={13} /> Mark job complete
                </button>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <IconRupee size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number" min="1" value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="field !pl-7"
                    />
                  </div>
                  <button
                    className="btn-ghost btn-sm shrink-0"
                    onClick={() => act(() => api.paymentComplete(job.jobId, Number(amount), 'UPI'), `Payment recorded (₹${amount})`)}
                  >
                    Record payment
                  </button>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <IconStar size={13} className="text-amber-400" />
                    <span className="text-xs text-slate-600">Rate the worker</span>
                    <Stars value={rating} onChange={setRating} size={15} />
                  </div>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={() => act(() => api.ratingSubmit(job.jobId, assigned.workerId, rating, 'Rated from app'), `Rated ${rating}★`)}
                  >
                    Submit
                  </button>
                </div>
              </div>
            </div>
          )}

          {job.jobStatus === 'COMPLETED' && (
            <div className="space-y-1.5 text-sm text-slate-600">
              {assigned && <div className="flex items-center gap-2"><IconCheck size={14} className="text-brand-600" /> Completed by {assigned.workerName}</div>}
              {paid > 0 && <div className="flex items-center gap-2 text-xs"><IconRupee size={12} className="text-slate-400" /> ₹{paid} paid</div>}
              {rated && <div className="flex items-center gap-1.5 text-xs"><Stars value={rated.rating} size={11} /> {rated.rating}/5</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
