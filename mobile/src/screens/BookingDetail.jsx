import { useEffect, useState } from 'react';
import { api } from '../api.js';
import {
  Sheet, SheetHeader, Stepper, FairWageCard, PaymentMethods, WorkerMatchCard, Avatar, Stars, StatusChip,
} from '../ui.jsx';
import {
  IconSparkle, IconClock, IconArrowRight, IconPhone, IconChat, IconCheck, IconRupee, IconShield, IconMapPin,
} from '../icons.jsx';
import { fairWage, matchScore, stageIndex, STAGES, timeAgo } from '../lib.js';

export default function BookingDetail({ ctx, jobId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [method, setMethod] = useState('UPI');
  const [rating, setRating] = useState(5);

  useEffect(() => {
    api.job(jobId).then(setDetail).catch(() => {});
  }, [jobId, ctx.tick]);

  const job = detail?.job;
  const interests = detail?.interests || [];
  const bookable = interests.filter((i) => i.status === 'INTERESTED');
  const assigned = interests.find((i) => i.status === 'HIRED');
  const notified = job?.shortlist?.length || 0;
  const paid = (detail?.payments || []).reduce((s, p) => s + p.amount, 0);
  const rated = (detail?.ratings || [])[0];
  const ranked = [...bookable].sort((a, b) => matchScore(b, job || {}) - matchScore(a, job || {}));
  const wage = job ? fairWage(job.serviceType, assigned || {}) : null;

  const act = async (fn, label) => {
    try { await fn(); ctx.notify(label); ctx.bump(); }
    catch (e) { ctx.notify(e.message, 'error'); }
  };
  const book = async (w) => {
    try {
      const r = await api.customerHire(jobId, w.workerId);
      ctx.notify(`Booked ${r.workerName}`);
      ctx.bump();
    } catch (e) { ctx.notify(e.message, 'error'); }
  };

  if (!job) {
    return (
      <Sheet onClose={onClose}>
        <SheetHeader title="Loading booking…" />
      </Sheet>
    );
  }

  const isOpen = job.jobStatus === 'OPEN';
  const isAssigned = job.jobStatus === 'ASSIGNED';
  const isDone = job.jobStatus === 'COMPLETED';

  return (
    <Sheet onClose={onClose}>
      {isOpen && (
        <SheetHeader icon={IconSparkle} title="AI Smart Worker Matching" subtitle="By distance, skill rating & cooperative trust score" />
      )}
      {isAssigned && (
        <SheetHeader variant="ink" eyebrow="Live Dispatch Tracking" icon={IconMapPin} title={`${job.serviceType} Service`} subtitle={`${job.location} · ${job.jobId}`} />
      )}
      {isDone && (
        <SheetHeader variant="ink" eyebrow="Completed" icon={IconCheck} title={`${job.serviceType} Service`} subtitle={job.jobId} />
      )}

      <div className="space-y-4 p-4">
        <Stepper current={stageIndex(job, interests.length)} steps={STAGES} />

        {(job.description || job.photoData) && (
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-card">
            {job.description && <p className="text-sm text-slate-600">{job.description}</p>}
            {job.photoData && (
              <img src={job.photoData} alt="Reported issue" className="max-h-64 w-full rounded-xl object-cover" />
            )}
          </div>
        )}

        {/* ---------- OPEN: matching ---------- */}
        {isOpen && (
          <>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>{notified} notified</span>
              <span>{bookable.length} responded</span>
            </div>
            {ranked.length === 0 && (
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
                <IconClock size={15} /> Notified {notified} cooperative worker(s). Waiting for the first response…
              </div>
            )}
            {ranked.map((w, i) => (
              <WorkerMatchCard
                key={w.workerId}
                worker={w}
                job={job}
                top={i === 0 && ranked.length > 1}
                action={<button className="btn-primary btn-sm w-full" onClick={() => book(w)}>Book This Worker <IconArrowRight size={13} /></button>}
              />
            ))}
          </>
        )}

        {/* ---------- ASSIGNED ---------- */}
        {isAssigned && assigned && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="flex items-center gap-3">
                <Avatar name={assigned.workerName} size={44} />
                <div className="flex-1">
                  <div className="flex items-center gap-1 font-bold text-slate-800">{assigned.workerName} <IconShield size={13} className="text-brand-500" /></div>
                  <div className="text-xs text-accent-700">Cooperative Verified</div>
                </div>
                <span className="chip bg-accent-100 text-accent-700">{matchScore(assigned, job)}%</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <a href={`https://wa.me/${(assigned.phoneno || '').replace(/[^\d]/g, '')}`} target="_blank" rel="noreferrer" className="btn bg-accent-500 text-white btn-sm">
                  <IconChat size={13} /> WhatsApp
                </a>
                <a href={`tel:${assigned.phoneno}`} className="btn-solid btn-sm"><IconPhone size={13} /> Call</a>
                <button className="btn-dark btn-sm"><IconChat size={13} /> Chat</button>
              </div>
            </div>

            <div className="rounded-2xl border border-accent-200 bg-accent-50 p-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-accent-700">Start service OTP</div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className="text-xs text-slate-500">Provide to worker on arrival</span>
                <span className="font-mono text-2xl font-bold tracking-widest text-accent-700">{otp(job.jobId)}</span>
              </div>
            </div>

            <FairWageCard service={job.serviceType} worker={assigned} bookingId={`BK-${job.jobId.slice(-4)}`} />

            <div className="space-y-2">
              <p className="section-title">Select payment method</p>
              <PaymentMethods value={method} onChange={setMethod} />
              <button className="btn-primary w-full" onClick={() => act(() => api.paymentComplete(jobId, wage.total, method), `Paid ₹${wage.total} (${method})`)}>
                <IconRupee size={14} /> Pay ₹{wage.total} via {method}
              </button>
            </div>

            <button className="btn-ghost w-full" onClick={() => act(() => api.jobComplete(jobId), 'Marked complete')}>
              <IconCheck size={14} /> Mark job complete
            </button>

            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-600">Rate <Stars value={rating} onChange={setRating} size={16} /></span>
              <button className="btn-ghost btn-sm" onClick={() => act(() => api.ratingSubmit(jobId, assigned.workerId, rating, 'Rated from app'), `Rated ${rating}★`)}>
                Submit
              </button>
            </div>
          </>
        )}

        {/* ---------- COMPLETED ---------- */}
        {isDone && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-card">
              {assigned && <div className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><IconCheck size={15} className="text-accent-600" /> Completed by {assigned.workerName}</div>}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                {paid > 0 && <span className="inline-flex items-center gap-1"><IconRupee size={12} /> ₹{paid} paid</span>}
                {rated && <span className="inline-flex items-center gap-1.5"><Stars value={rated.rating} size={11} /> {rated.rating}/5</span>}
                <span className="inline-flex items-center gap-1"><IconMapPin size={11} /> {job.location}</span>
                <span>{timeAgo(job.createdAt)}</span>
              </div>
            </div>
            {wage && <FairWageCard service={job.serviceType} worker={assigned || {}} bookingId={`BK-${job.jobId.slice(-4)}`} />}
          </div>
        )}

        {isOpen && (
          <div className="flex items-center justify-center gap-1 pt-1 text-[11px] text-slate-400">
            <StatusChip status={job.jobStatus} /> · {timeAgo(job.createdAt)}
          </div>
        )}
      </div>
    </Sheet>
  );
}

// stable 4-digit "OTP" from job id — cosmetic, mirrors the reference screen
function otp(jobId = '') {
  let h = 0;
  for (let i = 0; i < jobId.length; i++) h = (h * 31 + jobId.charCodeAt(i)) & 0xffff;
  return String(1000 + (h % 9000));
}
