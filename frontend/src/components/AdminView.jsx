import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { StatusChip, SectionTitle, Avatar, Stars } from './ui.jsx';
import { timeAgo } from '../lib.js';
import {
  IconBriefcase, IconCheck, IconClock, IconRupee, IconUser, IconChart, IconBell, IconMapPin,
} from './icons.jsx';

export default function AdminView({ ctx }) {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [activity, setActivity] = useState([]);

  useEffect(() => {
    Promise.all([api.stats(), api.jobs(), api.workers(), api.activity()])
      .then(([s, j, w, a]) => {
        setStats(s); setJobs(j.jobs); setWorkers(w.workers); setActivity(a.activity);
      })
      .catch(() => {});
  }, [ctx.tick]);

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={IconClock} tone="amber" label="Open jobs" value={stats.jobs.open} />
          <Stat icon={IconBriefcase} tone="blue" label="Assigned" value={stats.jobs.assigned} />
          <Stat icon={IconCheck} tone="accent" label="Completed" value={stats.jobs.completed} />
          <Stat icon={IconRupee} tone="accent" label="Revenue" value={`₹${stats.revenue}`} />
          <Stat icon={IconUser} tone="slate" label="Workers" value={stats.workers.total} />
          <Stat icon={IconCheck} tone="accent" label="Available" value={stats.workers.available} />
          <Stat icon={IconClock} tone="rose" label="On cooldown" value={stats.workers.onCooldown} />
          <Stat icon={IconChart} tone="slate" label="Total jobs" value={stats.jobs.total} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <SectionTitle icon={IconBriefcase} right={<span className="text-xs text-slate-400">{jobs.length}</span>}>Jobs</SectionTitle>
          <Table
            head={['Job', 'Service', 'Location', 'Status', 'Worker']}
            rows={jobs.map((j) => [
              <span className="font-mono text-[11px] text-slate-400">{j.jobId}</span>,
              j.serviceType,
              <span className="inline-flex items-center gap-1 text-slate-500"><IconMapPin size={11} />{j.location}</span>,
              <StatusChip status={j.jobStatus} />,
              j.assignedWorkerId ? <span className="font-mono text-xs">{j.assignedWorkerId}</span> : '—',
            ])}
          />
        </div>

        <div className="card">
          <SectionTitle icon={IconUser} right={<span className="text-xs text-slate-400">{workers.length}</span>}>Workers</SectionTitle>
          <Table
            head={['Name', 'Skill', 'Location', 'Status', 'Rating', 'Jobs']}
            rows={workers.map((w) => [
              <span className="inline-flex items-center gap-2">
                <Avatar name={w.name} size={22} />
                <span className="font-medium text-slate-700">{w.name}</span>
              </span>,
              w.skill,
              w.location,
              <span className="inline-flex items-center gap-1">
                <StatusChip status={w.availability} />
                {w.onCooldown && <span title="On cooldown">❄️</span>}
              </span>,
              <span className="inline-flex items-center gap-1"><Stars value={w.rating} size={10} /><span className="text-xs text-slate-500">{Number(w.rating).toFixed(1)}</span></span>,
              w.recentJobs,
            ])}
          />
        </div>
      </div>

      <div className="card">
        <SectionTitle icon={IconBell} right={<span className="text-xs text-slate-400">{activity.length} events</span>}>Activity feed</SectionTitle>
        <ActivityFeed activity={activity} />
      </div>
    </div>
  );
}

const TONES = {
  amber: 'bg-amber-50 text-amber-600',
  blue: 'bg-brand-50 text-brand-600',
  accent: 'bg-accent-50 text-accent-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
};

function Stat({ icon: Icon, tone = 'slate', label, value }) {
  return (
    <div className="card-tight flex items-center gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${TONES[tone]}`}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <div className="font-display text-xl font-semibold leading-tight text-slate-900">{value}</div>
        <div className="truncate text-[11px] text-slate-500">{label}</div>
      </div>
    </div>
  );
}

function Table({ head, rows }) {
  return (
    <div className="-mx-2 overflow-x-auto px-2">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-slate-400">
            {head.map((h) => <th key={h} className="whitespace-nowrap pb-2 pr-4 font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100 hover:bg-slate-50/60">
              {r.map((c, j) => <td key={j} className="whitespace-nowrap py-2 pr-4 text-slate-700">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-4 text-center text-xs text-slate-400">Nothing yet.</p>}
    </div>
  );
}

const KIND_BADGE = {
  job: 'bg-amber-100 text-amber-800',
  interest: 'bg-brand-100 text-brand-800',
  hire: 'bg-accent-100 text-accent-700',
  signup: 'bg-violet-100 text-violet-800',
  notify: 'bg-slate-100 text-slate-600',
  payment: 'bg-emerald-100 text-emerald-800',
  rating: 'bg-pink-100 text-pink-800',
};

function ActivityFeed({ activity }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; }, [activity]);

  if (activity.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-400">No activity yet.</p>;
  }
  return (
    <div ref={ref} className="max-h-96 space-y-0.5 overflow-auto">
      {activity.map((a) => (
        <div key={a.id} className="flex items-start gap-2.5 rounded-lg px-1 py-1.5 text-sm hover:bg-slate-50">
          <span className="mt-0.5 w-16 shrink-0 text-right text-[11px] text-slate-400">{timeAgo(a.ts)}</span>
          <span className={`chip shrink-0 ${KIND_BADGE[a.kind] || 'bg-slate-100 text-slate-600'}`}>
            {a.kind}{a.channel ? `·${a.channel}` : ''}
          </span>
          <span className="flex-1 text-slate-700">{a.message}</span>
          {a.simulated && <span className="mt-0.5 shrink-0 rounded bg-slate-100 px-1 text-[10px] text-slate-400">sim</span>}
        </div>
      ))}
    </div>
  );
}
