import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { StatusChip, EmptyState } from '../../ui.jsx';
import { IconBriefcase, IconMapPin } from '../../icons.jsx';
import { fairWage } from '../../lib.js';

export default function WorkerMyWork({ ctx }) {
  const wid = ctx.worker?.workerId;
  const [data, setData] = useState(null);
  const me = ctx.worker || {};

  useEffect(() => {
    if (!wid) return;
    api.workerJobs(wid).then(setData).catch(() => setData(null));
  }, [wid, ctx.tick]);

  const assigned = data?.assignedJobs || [];
  const live = assigned.filter((j) => j.jobStatus === 'ASSIGNED');
  const done = assigned.filter((j) => j.jobStatus !== 'ASSIGNED');

  return (
    <div className="pb-6">
      <div className="bg-grad-brand px-5 pb-6 pt-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Worker</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">My work</h1>
        <p className="mt-1 text-sm text-white/85">Jobs you've been hired for, with guaranteed payouts.</p>
      </div>

      <div className="space-y-4 px-4 pt-5">
        {!data && <EmptyState icon={IconBriefcase} title="Loading…" />}
        {data && assigned.length === 0 && (
          <EmptyState icon={IconBriefcase} title="Nothing assigned yet" hint="Express interest in open jobs from the Jobs tab." />
        )}

        {live.length > 0 && <h2 className="section-title">Active</h2>}
        <div className="space-y-2.5">
          {live.map((j) => <JobCard key={j.jobId} job={j} me={me} />)}
        </div>

        {done.length > 0 && <h2 className="section-title pt-2">History</h2>}
        <div className="space-y-2.5">
          {done.map((j) => <JobCard key={j.jobId} job={j} me={me} />)}
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, me }) {
  const wage = fairWage(job.serviceType, me);
  return (
    <div className="card space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-slate-800">{job.serviceType}</div>
          <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
            <IconMapPin size={11} />{job.location} · {job.jobId}
          </div>
        </div>
        <StatusChip status={job.jobStatus} />
      </div>
      <div className="flex items-center justify-between rounded-xl bg-accent-50 px-3 py-2 text-xs">
        <span className="text-accent-700">Guaranteed payout</span>
        <span className="font-mono font-bold text-accent-700">₹{wage.total}</span>
      </div>
    </div>
  );
}
