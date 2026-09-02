import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { WorkerMatchCard, EmptyState } from '../../ui.jsx';
import { IconUsers, IconMapPin, IconArrowRight, IconClock } from '../../icons.jsx';
import { matchScore, timeAgo } from '../../lib.js';
import BookingDetail from '../BookingDetail.jsx';

export default function CustomerInterested({ ctx }) {
  const [groups, setGroups] = useState([]);
  const [total, setTotal] = useState(0);
  const [openId, setOpenId] = useState(null);
  const [hiring, setHiring] = useState('');

  useEffect(() => {
    api.myInterestedWorkers()
      .then((d) => { setGroups(d.groups || []); setTotal(d.totalInterested || 0); })
      .catch(() => {});
  }, [ctx.tick]);

  const hire = async (jobId, worker) => {
    setHiring(worker.workerId);
    try {
      const r = await api.customerHire(jobId, worker.workerId);
      ctx.notify(`Hired ${r.workerName}`);
      ctx.bump();
    } catch (e) {
      ctx.notify(e.message, 'error');
    } finally {
      setHiring('');
    }
  };

  return (
    <div className="pb-6">
      <div className="bg-grad-brand px-5 pb-6 pt-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Cooperative matches</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">Interested workers</h1>
        <p className="mt-1 text-sm text-white/85">
          {total > 0 ? `${total} worker(s) want your open gigs — pick one to hire.` : 'Workers who respond to your open gigs show up here.'}
        </p>
      </div>

      <div className="space-y-5 px-4 pt-5">
        {groups.length === 0 && (
          <EmptyState icon={IconUsers} title="No open gigs" hint="Create a gig from the New Gig tab and cooperative workers will start responding." />
        )}

        {groups.map(({ job, workers }) => {
          const ranked = [...workers].sort((a, b) => matchScore(b, job) - matchScore(a, job));
          return (
            <div key={job.jobId} className="space-y-2.5">
              <button
                onClick={() => setOpenId(job.jobId)}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-card"
              >
                <div>
                  <div className="font-display font-bold text-slate-900">{job.serviceType}</div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <IconMapPin size={11} />{job.location} · {timeAgo(job.createdAt)}
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[11px] font-bold text-brand-600">
                  {workers.length ? `${workers.length} interested` : 'waiting'} <IconArrowRight size={12} />
                </span>
              </button>

              {ranked.length === 0 && (
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-4 text-xs text-slate-500">
                  <IconClock size={15} /> Notified {job.shortlist?.length || 0} worker(s). Waiting for the first response…
                </div>
              )}

              {ranked.map((w, i) => (
                <WorkerMatchCard
                  key={w.workerId}
                  worker={w}
                  job={job}
                  top={i === 0 && ranked.length > 1}
                  action={
                    <button
                      className="btn-primary btn-sm w-full"
                      disabled={hiring === w.workerId}
                      onClick={() => hire(job.jobId, w)}
                    >
                      {hiring === w.workerId ? 'Hiring…' : 'Hire this worker'} <IconArrowRight size={13} />
                    </button>
                  }
                />
              ))}
            </div>
          );
        })}
      </div>

      {openId && <BookingDetail ctx={ctx} jobId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
