import { useState } from 'react';
import { api } from '../../api.js';
import { useAuth } from '../../auth.jsx';
import { Field, Banner } from '../../ui.jsx';
import { IconUser, IconShield, IconMail, IconPhone, IconMapPin, IconLogOut } from '../../icons.jsx';

export default function CustomerAccount({ ctx }) {
  const { refresh } = useAuth();
  const user = ctx.user || {};
  const [name, setName] = useState(user.name || '');
  const [location, setLocation] = useState(user.location || '');
  const [busy, setBusy] = useState(false);

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
        <div className="text-[10px] font-bold uppercase tracking-widest text-white/70">Your profile</div>
        <h1 className="font-display text-2xl font-semibold leading-tight">Account</h1>
        <p className="mt-1 text-sm text-white/85">Signed in as a customer.</p>
      </div>

      <div className="space-y-4 px-4 pt-5">
        <div className="card space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <IconUser size={15} className="text-brand-500" /> Personal details
          </div>
          <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Field label="Area / city" value={location} onChange={(e) => setLocation(e.target.value)} />

          <div className="space-y-1.5 rounded-2xl bg-slate-50 px-3 py-2.5 text-xs text-slate-500">
            <div className="flex items-center gap-2"><IconMail size={12} /> {user.email || '—'}</div>
            <div className="flex items-center gap-2"><IconPhone size={12} /> {user.phone || '—'}</div>
            <p className="text-[11px] text-slate-400">Your login email / phone can't be changed here.</p>
          </div>

          <button className="btn-primary w-full" disabled={busy || !dirty} onClick={save}>
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className="card space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <IconShield size={15} className="text-brand-500" /> About Sahayak
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            A cooperative gig-worker platform. Every worker is a verified co-op member on guaranteed
            fair-wage rates with a pension &amp; insurance pool. Matching is by skill, location and
            cooperative trust score — never by lowest bid.
          </p>
        </div>

        <button className="btn-ghost w-full text-rose-600" onClick={ctx.logout}>
          <IconLogOut size={15} /> Log out
        </button>
      </div>
    </div>
  );
}
