import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, StatusChip, SectionTitle, EmptyState, Stars, Avatar, Banner, timeAgo } from './ui.jsx';
import { IconWrench, IconUser, IconBriefcase, IconMapPin, IconCheck, IconClock } from './icons.jsx';

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

  const matchedJobs = (data?.openJobs || []).filter((j) => j.matched);
  const otherJobs = (data?.openJobs || []).filter((j) => !j.matched);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
      <section className="space-y-4">
        <div className="card space-y-2.5">
          <SectionTitle icon={IconUser}>Act as an existing worker</SectionTitle>
          <select className="field" value={workerId} onChange={(e) => pick(e.target.value)}>
            <option value="">— select a demo worker —</option>
            {allWorkers.map((w) => (
              <option key={w.workerId} value={w.workerId}>
                {w.name} · {w.skill} · {w.location}{w.onCooldown ? ' (cooldown)' : ''}
              </option>
            ))}
          </select>

          {me && (
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
              <Avatar name={me.name} size={38} />
              <div className="min-w-0 text-sm">
                <div className="font-medium text-slate-800">{me.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <StatusChip status={me.availability} />
                  <Stars value={me.rating} size={11} />
                  <span>{Number(me.rating).toFixed(1)} · {me.recentJobs} done</span>
                </div>
              </div>
            </div>
          )}
          {me?.onCooldown && (
            <Banner tone="warn">
              On cooldown until {new Date(me.cooldownUntil).toLocaleString()} — you can still browse jobs but won't be matched to new ones.
            </Banner>
          )}
        </div>

        <form onSubmit={register} className="card space-y-3">
          <SectionTitle icon={IconWrench}>Join as a worker</SectionTitle>
          <Field label="Name" placeholder="Full name" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" placeholder="10-digit" value={signup.phoneno} onChange={(e) => setSignup({ ...signup, phoneno: e.target.value })} />
            <Field label="Email" placeholder="Optional" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Skill" options={SKILLS} value={signup.skill} onChange={(e) => setSignup({ ...signup, skill: e.target.value })} />
            <Field label="Location" value={signup.location} onChange={(e) => setSignup({ ...signup, location: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
        </form>
      </section>

      <section className="space-y-4">
        {!workerId && (
          <EmptyState icon={IconWrench} title="Pick or create a worker" hint="Select a demo worker or register a new one to see jobs." />
        )}

        {data && (
          <>
            <SectionTitle icon={IconBriefcase} right={matchedJobs.length > 0 && <span className="chip bg-brand-100 text-brand-700">{matchedJobs.length} matched</span>}>
              Open jobs
            </SectionTitle>

            {matchedJobs.length === 0 && otherJobs.length === 0 && (
              <EmptyState icon={IconClock} title="No open jobs right now" hint="New requests show up here automatically." />
            )}

            {matchedJobs.map((j) => <OpenJobCard key={j.jobId} job={j} onExpress={express} disabled={me?.onCooldown} />)}

            {otherJobs.length > 0 && (
              <>
                <p className="section-title pt-1">Outside your skill / area</p>
                {otherJobs.map((j) => <OpenJobCard key={j.jobId} job={j} muted />)}
              </>
            )}

            <SectionTitle icon={IconCheck} right={null}>Assigned to you</SectionTitle>
            {data.assignedJobs.length === 0 && (
              <EmptyState icon={IconBriefcase} title="Nothing assigned yet" />
            )}
            {data.assignedJobs.map((j) => (
              <div key={j.jobId} className="card-tight flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{j.serviceType}</div>
                  <div className="flex items-center gap-1 text-xs text-slate-500"><IconMapPin size={11} />{j.location} · {j.jobId}</div>
                </div>
                <StatusChip status={j.jobStatus} />
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}

function OpenJobCard({ job, onExpress, disabled, muted }) {
  return (
    <div className={`card-tight space-y-2 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-medium text-slate-800">{job.serviceType}</span>
          <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-slate-500"><IconMapPin size={11} />{job.location}</span>
        </div>
        {job.matched
          ? <span className="chip bg-brand-100 text-brand-700"><IconCheck size={11} />matched</span>
          : <span className="chip bg-slate-100 text-slate-500">not matched</span>}
      </div>
      {job.description && <p className="text-sm text-slate-600">{job.description}</p>}
      <div className="text-[11px] text-slate-400">{job.jobId} · {timeAgo(job.createdAt)}</div>
      {job.myStatus ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700">
          <IconCheck size={12} /> Your status: {job.myStatus}
        </span>
      ) : onExpress ? (
        <button className="btn-primary btn-sm" disabled={disabled} onClick={() => onExpress(job.jobId)}>
          Express interest
        </button>
      ) : null}
    </div>
  );
}
