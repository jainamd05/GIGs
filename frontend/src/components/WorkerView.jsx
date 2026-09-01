import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, StatusChip } from './ui.jsx';

const SKILLS = ['Plumbing', 'Electrician', 'Cleaning', 'Carpentry'];
const LS_KEY = 'sahayak.workerId';

export default function WorkerView({ ctx }) {
  const [workerId, setWorkerId] = useState(() => localStorage.getItem(LS_KEY) || '');
  const [allWorkers, setAllWorkers] = useState([]);
  const [signup, setSignup] = useState({ name: '', phoneno: '', email: '', skill: 'Plumbing', location: 'Rajkot' });
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = (id) => { setWorkerId(id); localStorage.setItem(LS_KEY, id); ctx.bump(); };

  useEffect(() => { api.workers().then((d) => setAllWorkers(d.workers)).catch(() => {}); }, [ctx.tick]);
  useEffect(() => {
    if (!workerId) { setData(null); return; }
    api.workerJobs(workerId).then(setData).catch(() => setData(null));
  }, [workerId, ctx.tick]);

  const me = allWorkers.find((w) => w.workerId === workerId);

  const register = async (e) => {
    e.preventDefault();
    if (!signup.name) return ctx.notify('Enter a name', 'error');
    setBusy(true);
    try {
      const r = await api.newWorker(signup);
      ctx.notify(`Registered as ${r.workerId}`);
      pick(r.workerId);
      setSignup({ ...signup, name: '', phoneno: '', email: '' });
    } catch (err) { ctx.notify(err.message, 'error'); }
    finally { setBusy(false); }
  };

  const express = async (jobId) => {
    try {
      await api.workerAccept({ jobId, workerId });
      ctx.notify('Interest recorded');
      ctx.bump();
    } catch (e) { ctx.notify(e.message, 'error'); }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section className="space-y-4">
        <form onSubmit={register} className="card space-y-3">
          <h2 className="font-semibold">Join as a worker</h2>
          <Field label="Name" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" value={signup.phoneno} onChange={(e) => setSignup({ ...signup, phoneno: e.target.value })} />
            <Field label="Email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Skill" options={SKILLS} value={signup.skill} onChange={(e) => setSignup({ ...signup, skill: e.target.value })} />
            <Field label="Location" value={signup.location} onChange={(e) => setSignup({ ...signup, location: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
        </form>

        <div className="card space-y-2">
          <h2 className="font-semibold">Act as an existing worker</h2>
          <select className="field" value={workerId} onChange={(e) => pick(e.target.value)}>
            <option value="">— select —</option>
            {allWorkers.map((w) => (
              <option key={w.workerId} value={w.workerId}>
                {w.name} · {w.skill} · {w.location}{w.onCooldown ? ' (cooldown)' : ''}
              </option>
            ))}
          </select>
          {me && (
            <div className="text-sm text-slate-600">
              <StatusChip status={me.availability} /> ★{me.rating} · {me.recentJobs} jobs done
              {me.onCooldown && <span className="ml-2 text-rose-600">on cooldown until {new Date(me.cooldownUntil).toLocaleString()}</span>}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        {!workerId && <p className="text-sm text-slate-500">Register or select a worker to see jobs.</p>}

        {data && (
          <>
            <h2 className="font-semibold">Open jobs</h2>
            {data.openJobs.length === 0 && <p className="text-sm text-slate-500">No open jobs right now.</p>}
            {data.openJobs.map((j) => (
              <div key={j.jobId} className="card space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{j.serviceType} · {j.location}</span>
                  {j.matched ? <span className="chip bg-brand-100 text-brand-700">matched to you</span>
                            : <span className="chip bg-slate-100 text-slate-500">not in your area/skill</span>}
                </div>
                {j.description && <p className="text-sm text-slate-600">{j.description}</p>}
                <div className="text-xs text-slate-400">{j.jobId}</div>
                {j.myStatus
                  ? <span className="text-xs text-brand-700">Your status: {j.myStatus}</span>
                  : <button className="btn-primary py-1" disabled={!j.matched} onClick={() => express(j.jobId)}>Express interest</button>}
              </div>
            ))}

            <h2 className="font-semibold pt-2">Assigned to you</h2>
            {data.assignedJobs.length === 0 && <p className="text-sm text-slate-500">Nothing assigned.</p>}
            {data.assignedJobs.map((j) => (
              <div key={j.jobId} className="card flex items-center justify-between">
                <span>{j.serviceType} · {j.location} <span className="text-xs text-slate-400">{j.jobId}</span></span>
                <StatusChip status={j.jobStatus} />
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
