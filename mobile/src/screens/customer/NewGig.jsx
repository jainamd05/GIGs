import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { StatusChip, EmptyState, Stepper } from '../../ui.jsx';
import {
  IconBriefcase, IconMapPin, IconArrowRight, IconAlert, IconClock, SERVICE_ICON,
} from '../../icons.jsx';
import { SERVICE_TYPES, SERVICE_META, baseRate, stageIndex, timeAgo, expiryLabel, STAGES } from '../../lib.js';
import RequestSheet from '../RequestSheet.jsx';
import BookingDetail from '../BookingDetail.jsx';

export default function CustomerNewGig({ ctx }) {
  const { user } = ctx;
  const [jobs, setJobs] = useState([]);
  const [sheet, setSheet] = useState(null); // { type:'request', service } | { type:'booking', id }

  useEffect(() => {
    api.myJobs().then((d) => setJobs(d.jobs)).catch(() => {});
  }, [ctx.tick]);

  const firstName = (user?.name || 'there').split(/\s+/)[0];
  const active = jobs.filter((j) => j.jobStatus === 'OPEN' || j.jobStatus === 'ASSIGNED');
  const past = jobs.filter((j) => j.jobStatus === 'COMPLETED' || j.jobStatus === 'CANCELLED');

  return (
    <div className="pb-6">
      <div className="bg-grad-brand px-5 pb-6 pt-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Verified platform</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">Hello, {firstName} 👋</h1>
        <p className="mt-1 text-sm text-white/85">Request a verified craftsman on a guaranteed fair-wage rate.</p>
      </div>

      <div className="space-y-5 px-4 pt-5">
        {/* SOS */}
        <button
          onClick={() => setSheet({ type: 'request', service: 'Electrician', priority: 'instant' })}
          className="flex w-full items-center gap-3 rounded-2xl bg-grad-sos px-4 py-3.5 text-left text-white shadow-card"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white/20 text-xs font-bold">SOS</span>
          <span className="flex-1">
            <span className="flex items-center gap-1 text-sm font-bold">Emergency Dispatch <IconAlert size={13} /></span>
            <span className="text-xs text-white/85">Guaranteed rapid arrival within 15 mins</span>
          </span>
          <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-rose-600">REQUEST ›</span>
        </button>

        {/* service categories → new gig */}
        <div>
          <h2 className="section-title mb-2">Create a new gig</h2>
          <div className="grid grid-cols-4 gap-2.5">
            {SERVICE_TYPES.map((s) => {
              const Icon = SERVICE_ICON[s];
              return (
                <button
                  key={s}
                  onClick={() => setSheet({ type: 'request', service: s })}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2.5 text-center shadow-card active:bg-slate-50"
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${SERVICE_META[s].tint}`}><Icon size={19} /></span>
                  <span className="text-[11px] font-bold text-slate-700">{s}</span>
                  <span className="font-mono text-[10px] text-slate-400">From ₹{baseRate(s)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* my gigs */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="section-title">Your gig requests</h2>
            {jobs.length > 0 && <span className="text-[11px] text-slate-400">{jobs.length}</span>}
          </div>

          {jobs.length === 0 && (
            <EmptyState icon={IconBriefcase} title="No requests yet" hint="Pick a service above to create your first gig." />
          )}

          <div className="space-y-2.5">
            {active.map((j) => <GigRow key={j.jobId} job={j} onOpen={() => setSheet({ type: 'booking', id: j.jobId })} />)}
            {past.length > 0 && <p className="section-title pt-2">History</p>}
            {past.map((j) => <GigRow key={j.jobId} job={j} onOpen={() => setSheet({ type: 'booking', id: j.jobId })} />)}
          </div>
        </div>
      </div>

      {sheet?.type === 'request' && (
        <RequestSheet
          ctx={ctx}
          initialService={sheet.service}
          initialPriority={sheet.priority}
          onClose={() => setSheet(null)}
          onCreated={(jobId) => setSheet({ type: 'booking', id: jobId })}
        />
      )}
      {sheet?.type === 'booking' && (
        <BookingDetail ctx={ctx} jobId={sheet.id} onClose={() => setSheet(null)} />
      )}
    </div>
  );
}

function GigRow({ job, onOpen }) {
  const exp = expiryLabel(job.expiresAt, job.jobStatus);
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-card active:bg-slate-50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-display font-bold text-slate-900">{job.serviceType}</div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <IconMapPin size={11} />{job.location} · {timeAgo(job.createdAt)}
          </div>
        </div>
        <StatusChip status={job.jobStatus} />
      </div>

      {job.jobStatus === 'CANCELLED' ? (
        <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
          <IconAlert size={12} /> {job.cancelReason || 'Cancelled'}
        </div>
      ) : (
        <>
          <div className="mt-3"><Stepper current={stageIndex(job)} steps={STAGES} /></div>
          {exp && (
            <div className={`mt-2 flex items-center gap-1 text-[11px] font-bold ${exp.tone === 'warn' ? 'text-amber-600' : 'text-slate-400'}`}>
              <IconClock size={11} /> {exp.text} if no worker is hired
            </div>
          )}
        </>
      )}

      <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-bold text-brand-600">
        Open <IconArrowRight size={12} />
      </div>
    </button>
  );
}
