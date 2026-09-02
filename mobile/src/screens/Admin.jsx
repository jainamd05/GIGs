import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { StatusChip, Avatar, Stars } from '../ui.jsx';
import {
  IconBriefcase, IconCheck, IconClock, IconRupee, IconUser, IconChart, IconBell, IconMapPin, IconLogOut,
} from '../icons.jsx';
import { timeAgo } from '../lib.js';

export default function AdminScreen({ ctx }) {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    Promise.all([api.stats(), api.jobs(), api.workers(), api.activity()])
      .then(([s, j, w, a]) => { setStats(s); setJobs(j.jobs); setWorkers(w.workers); setActivity(a.activity); })
      .catch(() => {});
  }, [ctx.tick]);

  return (
    <div className="pb-6">
      <div className="bg-grad-ink px-5 pb-6 pt-4 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-white/60">Operations</div>
            <h1 className="font-display text-2xl font-semibold leading-tight">Admin dashboard</h1>
            <p className="mt-1 text-sm text-white/70">Live view of jobs, workers and activity.</p>
          </div>
          <button
            onClick={ctx.logout}
            className="flex items-center gap-1 rounded-xl bg-white/15 px-2.5 py-1.5 text-[11px] font-bold text-white active:bg-white/25"
          >
            <IconLogOut size={13} /> Log out
          </button>
        </div>
      </div>

      <div className="space-y-5 px-4 pt-5">
        {stats && (
          <div className="grid grid-cols-2 gap-2.5">
            <Stat icon={IconClock} tone="amber" label="Open jobs" value={stats.jobs.open} />
            <Stat icon={IconBriefcase} tone="blue" label="Assigned" value={stats.jobs.assigned} />
            <Stat icon={IconCheck} tone="accent" label="Completed" value={stats.jobs.completed} />
            <Stat icon={IconRupee} tone="accent" label="Revenue" value={`₹${stats.revenue}`} />
            <Stat icon={IconUser} tone="slate" label="Workers" value={stats.workers.total} />
            <Stat icon={IconChart} tone="slate" label="On cooldown" value={stats.workers.onCooldown} />
          </div>
        )}

        <div>
          <h2 className="section-title mb-2">Jobs ({jobs.length})</h2>
          <div className="space-y-2">
            {jobs.map((j) => (
              <div key={j.jobId} className="card flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-800">{j.serviceType}</div>
                  <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                    <IconMapPin size={11} />{j.location} · {j.jobId}
                  </div>
                </div>
                <StatusChip status={j.jobStatus} />
              </div>
            ))}
            {jobs.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No jobs yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="section-title mb-2">Workers ({workers.length})</h2>
          <div className="space-y-2">
            {workers.map((w) => (
              <div key={w.workerId} className="card flex items-center gap-3">
                <Avatar name={w.name} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-800">{w.name}</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    {w.skill} · {w.location}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusChip status={w.availability} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Stars value={w.rating} size={10} />{Number(w.rating).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title mb-2 flex items-center gap-1.5"><IconBell size={13} /> Activity ({activity.length})</h2>
          <div className="noscroll max-h-80 space-y-1 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3">
            {activity.length === 0 && <p className="py-4 text-center text-xs text-slate-400">No activity yet.</p>}
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-2 py-1 text-xs">
                <span className="mt-0.5 w-12 shrink-0 text-right text-[10px] text-slate-400">{timeAgo(a.ts)}</span>
                <span className={`chip shrink-0 ${KIND[a.kind] || 'bg-slate-100 text-slate-600'}`}>{a.kind}</span>
                <span className="flex-1 text-slate-700">{a.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const KIND = {
  job: 'bg-amber-100 text-amber-800',
  interest: 'bg-brand-100 text-brand-800',
  hire: 'bg-accent-100 text-accent-700',
  signup: 'bg-violet-100 text-violet-800',
  notify: 'bg-slate-100 text-slate-600',
  payment: 'bg-emerald-100 text-emerald-800',
  rating: 'bg-pink-100 text-pink-800',
};
const TONES = {
  amber: 'bg-amber-50 text-amber-600', blue: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-50 text-accent-600', slate: 'bg-slate-100 text-slate-500',
};
function Stat({ icon: Icon, tone, label, value }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}><Icon size={16} /></span>
      <div className="min-w-0">
        <div className="font-display text-lg font-semibold leading-tight text-slate-900">{value}</div>
        <div className="truncate text-[11px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}
