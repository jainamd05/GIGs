import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { EmptyState, Banner } from '../../ui.jsx';
import { IconWrench, IconMapPin, IconCheck, IconClock } from '../../icons.jsx';
import { matchScore, timeAgo } from '../../lib.js';

export default function WorkerJobs({ ctx }) {
  const wid = ctx.worker?.workerId;
  const [me, setMe] = useState(ctx.worker || null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!wid) return;
    api.workers().then((d) => setMe(d.workers.find((w) => w.workerId === wid) || ctx.worker)).catch(() => {});
    api.workerJobs(wid).then(setData).catch(() => setData(null));
  }, [wid, ctx.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const express = async (jobId) => {
    try {
      await api.workerAccept({ jobId, workerId: wid });
      ctx.notify('Interest recorded');
      ctx.bump();
    } catch (e) {
      ctx.notify(e.message, 'error');
    }
  };

  const matched = (data?.openJobs || []).filter((j) => j.matched);
  const others = (data?.openJobs || []).filter((j) => !j.matched);
  const onCooldown = me?.onCooldown;

  return (
    <div className="pb-6">
      <div className="bg-grad-brand px-5 pb-6 pt-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Worker</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">
          {me ? `Hi, ${me.name.split(/\s+/)[0]} 👋` : 'Available jobs'}
        </h1>
        <p className="mt-1 text-sm text-white/85">Cooperative jobs matched by skill, area &amp; trust score.</p>
      </div>

      <div className="space-y-4 px-4 pt-5">
        {onCooldown && (
          <Banner tone="warn">
            On cooldown until {new Date(me.cooldownUntil).toLocaleString()} — you won't be matched to new jobs.
          </Banner>
        )}

        {!data && <EmptyState icon={IconWrench} title="Loading jobs…" />}

        {data && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="section-title">Jobs matched to you</h2>
              {matched.length > 0 && <span className="chip bg-accent-100 text-accent-700">{matched.length}</span>}
            </div>
            {matched.length === 0 && others.length === 0 && (
              <EmptyState icon={IconClock} title="No open jobs right now" hint="New requests appear here automatically." />
            )}
            {matched.length === 0 && others.length > 0 && (
              <EmptyState icon={IconWrench} title="Nothing matches you yet" hint="Jobs in your skill and area will show here." />
            )}
            <div className="space-y-2.5">
              {matched.map((j) => (
                <OpenJob key={j.jobId} job={j} me={me} onExpress={express} disabled={onCooldown} />
              ))}
              {others.length > 0 && <p className="section-title pt-1">Outside your skill / area</p>}
              {others.map((j) => <OpenJob key={j.jobId} job={j} me={me} muted />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function OpenJob({ job, me, onExpress, disabled, muted }) {
  const score = me && job.matched ? matchScore(me, job) : null;
  return (
    <div className={`card space-y-2 ${muted ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-bold text-slate-800">{job.serviceType}</span>
          <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-slate-500"><IconMapPin size={11} />{job.location}</span>
        </div>
        {job.matched
          ? <span className="chip bg-accent-100 text-accent-700">{score}% match</span>
          : <span className="chip bg-slate-100 text-slate-500">not matched</span>}
      </div>

      {job.photoData && (
        <img src={job.photoData} alt="Reported issue" className="max-h-40 w-full rounded-xl object-cover" />
      )}
      {job.description && <p className="text-sm text-slate-600">{job.description}</p>}

      <div className="font-mono text-[11px] text-slate-400">{job.jobId} · {timeAgo(job.createdAt)}</div>

      {job.myStatus ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-700"><IconCheck size={12} /> Your status: {job.myStatus}</span>
      ) : job.matched && onExpress ? (
        <button className="btn-primary btn-sm" disabled={disabled} onClick={() => onExpress(job.jobId)}>Express interest</button>
      ) : !job.matched ? (
        <span className="text-[11px] text-slate-400">{reasonText(job.matchReason)}</span>
      ) : null}
    </div>
  );
}

function reasonText(reason) {
  if (!reason) return 'Not eligible right now';
  if (reason.startsWith('location')) return 'Outside your service area';
  if (reason === 'different skill') return 'Different skill category';
  if (reason.startsWith('cooldown')) return 'You are on cooldown';
  if (reason === 'not available') return 'You are marked busy';
  if (reason === 'inactive membership') return 'Membership inactive';
  return 'Not eligible right now';
}
