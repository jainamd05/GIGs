import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Field, StatusChip, SectionTitle, EmptyState, Stars, Avatar, Banner,
  Stepper, FairWageCard, PaymentMethods, WorkerMatchCard,
} from './ui.jsx';
import {
  IconUser, IconPlus, IconMinus, IconBriefcase, IconChevron, IconMapPin, IconClock,
  IconCheck, IconRupee, IconArrowRight, IconBolt, IconCalendar, IconSparkle, IconPhone, SERVICE_ICON,
} from './icons.jsx';
import {
  SERVICE_TYPES, SERVICE_META, baseRate, fairWage, matchScore, STAGES, stageIndex, timeAgo,
} from '../lib.js';

const LS_KEY = 'sahayak.customer';

export default function CustomerView({ ctx }) {
  const [me, setMe] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  });
  const [form, setForm] = useState({
    serviceType: 'Plumbing', location: 'Rajkot', description: '', preferredTime: '',
    priority: 'instant', duration: 1,
  });
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);

  const saveMe = (next) => { setMe(next); localStorage.setItem(LS_KEY, JSON.stringify(next)); };
  const identified = me.customerName && me.customerContact;

  useEffect(() => {
    if (!me.customerName) return;
    api.jobs(`?customer=${encodeURIComponent(me.customerName)}`).then((d) => setJobs(d.jobs)).catch(() => {});
  }, [me.customerName, ctx.tick]);

  const submit = async (e) => {
    e.preventDefault();
    if (!identified) return ctx.notify('Enter your name and contact first', 'error');
    setBusy(true);
    try {
      const preferredTime = form.priority === 'instant'
        ? 'Instant dispatch'
        : form.preferredTime || 'Scheduled';
      const description = [form.description, `~${form.duration}h`].filter(Boolean).join(' · ');
      const r = await api.createGig({ ...me, ...form, preferredTime, description });
      ctx.notify(`Request ${r.jobId} — matching ${r.eligibleCount} worker(s)`);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
      <section className="space-y-4">
        <div className="card space-y-3">
          <SectionTitle icon={IconUser} right={identified && <span className="chip bg-accent-100 text-accent-700"><IconCheck size={12} />saved</span>}>
            Your details
          </SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" placeholder="e.g. Anita Shah" value={me.customerName || ''} onChange={(e) => saveMe({ ...me, customerName: e.target.value })} />
            <Field label="Phone" placeholder="10-digit number" value={me.customerContact || ''} onChange={(e) => saveMe({ ...me, customerContact: e.target.value })} />
          </div>
          <Field label="Email" hint="Optional — used for notifications" placeholder="you@example.com" value={me.customerEmail || ''} onChange={(e) => saveMe({ ...me, customerEmail: e.target.value })} />
          {!identified && <Banner tone="warn">Add your name and phone to submit a request. Details are stored on this device only.</Banner>}
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <SectionTitle icon={IconBolt}>Request a service</SectionTitle>

          <div>
            <span className="label">Service</span>
            <div className="grid grid-cols-4 gap-2">
              {SERVICE_TYPES.map((s) => {
                const Icon = SERVICE_ICON[s];
                const on = form.serviceType === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, serviceType: s })}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-semibold transition-colors ${
                      on ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-glow' : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${SERVICE_META[s].tint}`}><Icon size={16} /></span>
                    {s}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">Guaranteed fair-wage base rate: <b className="font-mono text-slate-600">₹{baseRate(form.serviceType)}/job</b></p>
          </div>

          <div>
            <span className="label">Booking priority</span>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm({ ...form, priority: 'instant' })} className={`seg ${form.priority === 'instant' ? 'seg-on' : 'seg-off'}`}>
                <IconBolt size={14} /> Instant Dispatch
              </button>
              <button type="button" onClick={() => setForm({ ...form, priority: 'schedule' })} className={`seg ${form.priority === 'schedule' ? 'seg-on' : 'seg-off'}`}>
                <IconCalendar size={14} /> Schedule Later
              </button>
            </div>
          </div>

          {form.priority === 'schedule' && (
            <Field label="Preferred time" placeholder="e.g. Tomorrow 10 AM" value={form.preferredTime} onChange={(e) => setForm({ ...form, preferredTime: e.target.value })} />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            <div>
              <span className="label">Estimated duration</span>
              <div className="flex items-center justify-between rounded-xl border border-slate-300 px-2 py-1.5">
                <button type="button" onClick={() => setForm({ ...form, duration: Math.max(1, form.duration - 1) })} className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100"><IconMinus size={13} /></button>
                <span className="text-sm font-semibold">{form.duration} hr{form.duration > 1 ? 's' : ''}</span>
                <button type="button" onClick={() => setForm({ ...form, duration: Math.min(8, form.duration + 1) })} className="grid h-7 w-7 place-items-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100"><IconPlus size={13} /></button>
              </div>
            </div>
          </div>

          <Field label="Issue / service details" hint="What needs doing?" placeholder="e.g. Kitchen tap is leaking" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

          <button className="btn-primary w-full" disabled={busy || !identified}>
            <IconSparkle size={15} /> {busy ? 'Matching…' : 'Run AI worker matching'} <IconArrowRight size={15} />
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <SectionTitle icon={IconBriefcase} right={jobs.length > 0 && <span className="text-xs text-slate-400">{jobs.length} total</span>}>
          Your bookings
        </SectionTitle>

        {!me.customerName && <EmptyState icon={IconUser} title="No bookings yet" hint="Enter your name on the left to load your bookings." />}
        {me.customerName && jobs.length === 0 && <EmptyState icon={IconBriefcase} title="No bookings yet" hint="Submit your first request using the form." />}

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
  const [open, setOpen] = useState(defaultOpen ?? (job.jobStatus === 'OPEN' || job.jobStatus === 'ASSIGNED'));
  const [method, setMethod] = useState('UPI');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    if (!open) return;
    api.job(job.jobId).then(setDetail).catch(() => {});
  }, [open, job.jobId, ctx.tick]);

  const hire = async (worker) => {
    if (!window.confirm(`Book ${worker.workerName}? Other applicants will be released.`)) return;
    try {
      const r = await api.customerHire(job.jobId, worker.workerId);
      ctx.notify(`Booked ${r.workerName}`);
      ctx.bump();
    } catch (e) { ctx.notify(e.message, 'error'); }
  };
  const act = async (fn, label) => {
    try { await fn(); ctx.notify(label); ctx.bump(); }
    catch (e) { ctx.notify(e.message, 'error'); }
  };

  const interests = detail?.interests || [];
  const bookable = interests.filter((i) => i.status === 'INTERESTED');
  const assigned = interests.find((i) => i.status === 'HIRED');
  const notified = detail?.job?.shortlist?.length || 0;
  const paid = (detail?.payments || []).reduce((s, p) => s + p.amount, 0);
  const rated = (detail?.ratings || [])[0];
  const stage = stageIndex(job, interests.length);
  const wage = fairWage(job.serviceType, assigned || {});

  // rank bookable workers by match score, top one flagged
  const ranked = [...bookable].sort((a, b) => matchScore(b, job) - matchScore(a, job));

  return (
    <div className="card space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-display font-semibold text-slate-900">{job.serviceType}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500"><IconMapPin size={12} />{job.location}</span>
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-400">{job.jobId} · {timeAgo(job.createdAt)}</div>
        </div>
        <StatusChip status={job.jobStatus} />
      </div>

      {job.description && <p className="text-sm text-slate-600">{job.description}</p>}

      <Stepper current={stage} steps={STAGES} />

      <button
        className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
        onClick={() => setOpen((o) => !o)}
      >
        <IconChevron size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide details' : 'Show details'}
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 pt-3">
          {job.jobStatus === 'OPEN' && (
            <>
              <div className="flex items-center justify-between">
                <p className="section-title">AI worker matching</p>
                <span className="text-[11px] text-slate-400">{notified} notified · {bookable.length} responded</span>
              </div>
              {ranked.length === 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  <IconClock size={14} /> Notified {notified} cooperative worker(s). Waiting for the first to respond…
                </div>
              )}
              {ranked.map((i, idx) => (
                <WorkerMatchCard
                  key={i.workerId}
                  worker={i}
                  job={job}
                  top={idx === 0 && ranked.length > 1}
                  action={<button className="btn-primary btn-sm w-full" onClick={() => hire(i)}>Book this worker <IconArrowRight size={13} /></button>}
                />
              ))}
            </>
          )}

          {job.jobStatus === 'ASSIGNED' && assigned && (
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-brand-50 px-3 py-2.5">
                <Avatar name={assigned.workerName} size={40} />
                <div className="flex-1 text-sm">
                  <div className="font-semibold text-brand-900">{assigned.workerName}</div>
                  <div className="text-xs text-brand-700">Cooperative Verified · {assigned.phoneno}</div>
                </div>
                <a href={`tel:${assigned.phoneno}`} className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white"><IconPhone size={15} /></a>
              </div>

              <FairWageCard service={job.serviceType} worker={assigned} bookingId={`BK-${job.jobId.slice(-4)}`} />

              <div className="space-y-2">
                <p className="section-title">Select payment method</p>
                <PaymentMethods value={method} onChange={setMethod} />
                <button
                  className="btn-primary w-full"
                  onClick={() => act(() => api.paymentComplete(job.jobId, wage.total, method), `Payment recorded — ₹${wage.total} (${method})`)}
                >
                  <IconRupee size={14} /> Pay ₹{wage.total} via {method}
                </button>
              </div>

              <button
                className="btn-ghost w-full"
                onClick={() => act(() => api.jobComplete(job.jobId), 'Marked complete')}
              >
                <IconCheck size={14} /> Mark job complete
              </button>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                <span className="flex items-center gap-2 text-xs text-slate-600">Rate the worker <Stars value={rating} onChange={setRating} size={15} /></span>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => act(() => api.ratingSubmit(job.jobId, assigned.workerId, rating, 'Rated from app'), `Rated ${rating}★`)}
                >
                  Submit
                </button>
              </div>
            </>
          )}

          {job.jobStatus === 'COMPLETED' && (
            <div className="space-y-2 text-sm text-slate-600">
              {assigned && <div className="flex items-center gap-2"><IconCheck size={14} className="text-accent-600" /> Completed by {assigned.workerName}</div>}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {paid > 0 && <span className="inline-flex items-center gap-1"><IconRupee size={12} /> ₹{paid} paid</span>}
                {rated && <span className="inline-flex items-center gap-1.5"><Stars value={rated.rating} size={11} /> {rated.rating}/5</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
