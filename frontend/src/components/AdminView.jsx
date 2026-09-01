import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { StatusChip } from './ui.jsx';

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
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Open jobs" value={stats.jobs.open} />
          <Stat label="Assigned" value={stats.jobs.assigned} />
          <Stat label="Completed" value={stats.jobs.completed} />
          <Stat label="Revenue" value={`₹${stats.revenue}`} />
          <Stat label="Workers" value={stats.workers.total} />
          <Stat label="Available" value={stats.workers.available} />
          <Stat label="On cooldown" value={stats.workers.onCooldown} />
          <Stat label="Total jobs" value={stats.jobs.total} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 font-semibold">Jobs</h2>
          <Table
            head={['Job', 'Service', 'Location', 'Status', 'Assigned']}
            rows={jobs.map((j) => [
              j.jobId, j.serviceType, j.location, <StatusChip status={j.jobStatus} />, j.assignedWorkerId || '—',
            ])}
          />
        </div>

        <div className="card">
          <h2 className="mb-2 font-semibold">Workers</h2>
          <Table
            head={['ID', 'Name', 'Skill', 'Loc', 'Avail', '★', 'Jobs']}
            rows={workers.map((w) => [
              w.workerId, w.name, w.skill, w.location,
              <span className="flex items-center gap-1"><StatusChip status={w.availability} />{w.onCooldown ? '❄' : ''}</span>,
              w.rating, w.recentJobs,
            ])}
          />
        </div>
      </div>

      <div className="card">
        <h2 className="mb-2 font-semibold">Activity feed</h2>
        <div className="max-h-80 space-y-1 overflow-auto text-sm">
          {activity.map((a) => (
            <div key={a.id} className="flex gap-2 border-b border-slate-50 py-1">
              <span className="w-32 shrink-0 text-xs text-slate-400">{new Date(a.ts).toLocaleTimeString()}</span>
              <span className={`chip ${badge(a.kind)}`}>{a.kind}{a.channel ? `/${a.channel}` : ''}</span>
              <span className="flex-1">{a.message}</span>
              {a.simulated && <span className="text-[10px] text-slate-400">sim</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const badge = (kind) => ({
  job: 'bg-amber-100 text-amber-800',
  interest: 'bg-blue-100 text-blue-800',
  hire: 'bg-brand-100 text-brand-700',
  signup: 'bg-purple-100 text-purple-800',
  notify: 'bg-slate-100 text-slate-600',
  payment: 'bg-emerald-100 text-emerald-800',
  rating: 'bg-pink-100 text-pink-800',
}[kind] || 'bg-slate-100 text-slate-600');

function Stat({ label, value }) {
  return (
    <div className="card">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function Table({ head, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="text-xs text-slate-400">{head.map((h) => <th key={h} className="pb-1 pr-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              {r.map((c, j) => <td key={j} className="py-1.5 pr-3">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && <p className="py-2 text-xs text-slate-400">Nothing yet.</p>}
    </div>
  );
}
