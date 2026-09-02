import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Field, StatusChip, SectionTitle, EmptyState, Stars, Avatar, Banner } from './ui.jsx';
import {
  IconWrench, IconUser, IconBriefcase, IconMapPin, IconCheck, IconClock, IconRupee, IconShield,
} from './icons.jsx';
import { SERVICE_TYPES, fairWage, matchScore, timeAgo, coopId } from '../lib.js';

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,400px)_1fr]">
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
            <>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                <Avatar name={me.name} size={42} />
                <div className="min-w-0 text-sm">
                  <div className="flex items-center gap-1 font-semibold text-slate-800">{me.name} <IconShield size={13} className="text-brand-500" /></div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <StatusChip status={me.availability} />
                    <Stars value={me.rating} size={11} />
                    <span>{Number(me.rating).toFixed(1)} · {me.recentJobs} done</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="chip bg-brand-50 text-brand-700"><IconShield size={11} />{coopId(me)}</span>
                <span className="chip bg-accent-50 text-accent-700">Member Verified</span>
              </div>
            </>
          )}
          {me?.onCooldown && (
            <Banner tone="warn">
              On cooldown until {new Date(me.cooldownUntil).toLocaleString()} — browse jobs freely, but you won't be matched to new ones.
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
            <Field label="Skill" options={SERVICE_TYPES} value={signup.skill} onChange={(e) => setSignup({ ...signup, skill: e.target.value })} />
            <Field label="Location" value={signup.location} onChange={(e) => setSignup({ ...signup, location: e.target.value })} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Registering…' : 'Register'}</button>
        </form>
      </section>

      <section className="space-y-4">
        {!workerId && <EmptyState icon={IconWrench} title="Pick or create a worker" hint="Select a demo worker or register a new one to see jobs." />}

        {data && (
          <>
            <SectionTitle icon={IconBriefcase} right={matchedJobs.length > 0 && <span className="chip bg-accent-100 text-accent-700">{matchedJobs.length} matched</span>}>
              Open jobs
            </SectionTitle>

            {matchedJobs.length === 0 && otherJobs.length === 0 && (
              <EmptyState icon={IconClock} title="No open jobs right now" hint="New requests appear here automatically." />
            )}

            {matchedJobs.map((j) => (
              <OpenJobCard key={j.jobId} job={j} me={me} onExpress={express} disabled={me?.onCooldown} />
            ))}

            {otherJobs.length > 0 && (
              <>
                <p className="section-title pt-1">Outside your skill / area</p>
                {otherJobs.map((j) => <OpenJobCard key={j.jobId} job={j} me={me} muted />)}
              </>
            )}

            <SectionTitle icon={IconCheck}>Assigned to you</SectionTitle>
            {data.assignedJobs.length === 0 && <EmptyState icon={IconBriefcase} title="Nothing assigned yet" />}
            {data.assignedJobs.map((j) => {
              const wage = fairWage(j.serviceType, me || {});
              return (
                <div key={j.jobId} className="card-tight space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{j.serviceType}</div>
                      <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400"><IconMapPin size={11} />{j.location} · {j.jobId}</div>
                    </div>
                    <StatusChip status={j.jobStatus} />
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-accent-50 px-3 py-2 text-xs">
                    <span className="text-accent-700">Your guaranteed payout</span>
                    <span className="font-mono font-bold text-accent-700">₹{wage.total}</span>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}

function OpenJobCard({ job, me, onExpress, disabled, muted }) {
  const score = me ? matchScore(me, job) : null;
  return (
    <div className={`card-tight space-y-2 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-800">{job.serviceType}</span>
          <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-slate-500"><IconMapPin size={11} />{job.location}</span>
        </div>
        {job.matched && score != null
          ? <span className="chip bg-accent-100 text-accent-700">{score}% match</span>
          : <span className="chip bg-slate-100 text-slate-500">not matched</span>}
      </div>
      {job.description && <p className="text-sm text-slate-600">{job.description}</p>}
      <div className="font-mono text-[11px] text-slate-400">{job.jobId} · {timeAgo(job.createdAt)}</div>
      {job.myStatus ? (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
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
