import { useEffect, useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Field, Banner, Avatar, Stars, StatusChip } from '../../ui.jsx';
import {
  IconShield, IconUser, IconMail, IconPhone, IconWrench, IconLogOut, IconCheck,
} from '../../icons.jsx';
import { coopId } from '../../lib.js';

export default function WorkerProfile({ ctx }) {
  const { refresh } = useAuth();
  const user = ctx.user || {};
  const wid = ctx.worker?.workerId;
  const [me, setMe] = useState(ctx.worker || {});
  const [name, setName] = useState(user.name || '');
  const [location, setLocation] = useState(user.location || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!wid) return;
    api.workers().then((d) => setMe(d.workers.find((w) => w.workerId === wid) || ctx.worker)).catch(() => {});
  }, [wid, ctx.tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = name.trim() !== (user.name || '') || location.trim() !== (user.location || '');
  const save = async () => {
    if (!name.trim()) return ctx.notify('Name cannot be empty', 'error');
    setBusy(true);
    try {
      await api.updateMe({ name: name.trim(), location: location.trim() });
      await refresh();
      ctx.notify('Profile updated');
      ctx.bump();
    } catch (e) {
      ctx.notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-6">
      <div className="bg-grad-brand px-5 pb-6 pt-4 text-white">
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Worker profile</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">{user.name || 'Your profile'}</h1>
        <p className="mt-1 text-sm text-white/85">Verified cooperative member.</p>
      </div>

      <div className="space-y-4 px-4 pt-5">
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <Avatar name={me.name || user.name} size={46} />
            <div className="min-w-0 text-sm">
              <div className="flex items-center gap-1 font-bold text-slate-800">
                {me.name || user.name} <IconShield size={13} className="text-brand-500" />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                {me.availability && <StatusChip status={me.availability} />}
                <Stars value={me.rating || 5} size={11} />
                <span>{Number(me.rating || 5).toFixed(1)} · {me.recentJobs || 0} done</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="chip bg-brand-50 text-brand-700"><IconShield size={11} />{coopId(me.workerId ? me : { workerId: wid, location })}</span>
            <span className="chip bg-accent-50 text-accent-700"><IconCheck size={11} /> Member Verified</span>
            <span className="chip bg-slate-100 text-slate-600"><IconWrench size={11} /> {me.skill || ctx.worker?.skill}</span>
          </div>
          {me.onCooldown && (
            <Banner tone="warn">On cooldown until {new Date(me.cooldownUntil).toLocaleString()}.</Banner>
          )}
        </div>

        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <IconUser size={15} className="text-brand-500" /> Personal details
          </div>
          <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Area / city" value={location} onChange={(e) => setLocation(e.target.value)} />
          <div className="space-y-1.5 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <div className="flex items-center gap-2"><IconMail size={12} /> {user.email || '—'}</div>
            <div className="flex items-center gap-2"><IconPhone size={12} /> {user.phone || '—'}</div>
            <p className="text-[11px] text-slate-400">Your login email / phone and skill can't be changed here.</p>
          </div>
          <button className="btn-primary w-full" disabled={busy || !dirty} onClick={save}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <button className="btn-ghost w-full text-rose-600" onClick={ctx.logout}>
          <IconLogOut size={15} /> Log out
        </button>
      </div>
    </div>
  );
}
