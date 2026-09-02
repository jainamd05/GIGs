import { useRef, useState } from 'react';
import { api } from '../api.js';
import { Sheet, SheetHeader, Field, Banner } from '../ui.jsx';
import {
  IconBolt, IconCalendar, IconCamera, IconMapPin, IconMinus, IconPlus, IconSparkle, IconArrowRight, IconX, SERVICE_ICON,
} from '../icons.jsx';
import { SERVICE_TYPES, SERVICE_META, baseRate, resizeImageFile } from '../lib.js';

export default function RequestSheet({ ctx, initialService = 'Plumbing', initialPriority = 'instant', onClose, onCreated }) {
  const { user } = ctx;
  const [service, setService] = useState(SERVICE_TYPES.includes(initialService) ? initialService : 'Plumbing');
  const [priority, setPriority] = useState(initialPriority);
  const [preferredTime, setPreferredTime] = useState('');
  const [location, setLocation] = useState(user?.location || 'Rajkot');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null); // data URL
  const [duration, setDuration] = useState(1);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  const contact = user?.phone || user?.email || '';
  const identified = Boolean(user?.name && contact);

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    try {
      setPhoto(await resizeImageFile(file));
    } catch (err) {
      ctx.notify(err.message, 'error');
    }
  };

  const run = async () => {
    if (!identified) return ctx.notify('Your account is missing a name or contact', 'error');
    if (!description.trim() && !photo)
      return ctx.notify('Add a description or a photo of the issue', 'error');
    setBusy(true);
    try {
      const r = await api.createGig({
        customerName: user.name,
        customerContact: contact,
        customerEmail: user.email || '',
        serviceType: service,
        location,
        description: [description.trim(), `~${duration}h`].filter(Boolean).join(' · '),
        preferredTime: priority === 'instant' ? 'Instant dispatch' : preferredTime || 'Scheduled',
        ...(photo ? { photo } : {}),
      });
      ctx.notify(`Matching ${r.eligibleCount} worker(s)…`);
      ctx.bump();
      onCreated?.(r.jobId);
    } catch (e) {
      ctx.notify(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <SheetHeader icon={IconBolt} title={`Request ${service} Service`} subtitle="Guaranteed AI fair-wage match" />

      <div className="space-y-5 p-4">
        <div className="flex items-center justify-between rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Standard base rate</div>
            <div className="text-xs text-slate-500">Guaranteed fair wage rate</div>
          </div>
          <span className="rounded-full bg-white px-3 py-1.5 font-mono text-sm font-bold text-brand-700 shadow-sm">₹{baseRate(service)} / job</span>
        </div>

        {!identified && <Banner tone="warn">Your account is missing a name or contact number — update it in the Account tab.</Banner>}

        {/* service picker */}
        <div>
          <span className="label">Service</span>
          <div className="grid grid-cols-4 gap-2">
            {SERVICE_TYPES.map((s) => {
              const SIcon = SERVICE_ICON[s];
              const on = service === s;
              return (
                <button
                  key={s} type="button" onClick={() => setService(s)}
                  className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[10px] font-bold ${
                    on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                  }`}
                >
                  <span className={`grid h-8 w-8 place-items-center rounded-lg ${SERVICE_META[s].tint}`}><SIcon size={15} /></span>
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        {/* booking priority */}
        <div>
          <span className="label">Booking priority</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setPriority('instant')} className={`seg ${priority === 'instant' ? 'seg-on' : 'seg-off'}`}>
              <IconBolt size={14} /> Instant Dispatch
            </button>
            <button type="button" onClick={() => setPriority('schedule')} className={`seg ${priority === 'schedule' ? 'seg-on' : 'seg-off'}`}>
              <IconCalendar size={14} /> Schedule Later
            </button>
          </div>
        </div>

        {priority === 'schedule' && (
          <Field label="Preferred time" placeholder="e.g. Tomorrow 10 AM" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
        )}

        <label className="block">
          <span className="label">Issue / service details</span>
          <textarea
            rows={3}
            className="field resize-none"
            placeholder="Describe the issue (e.g. Master bedroom switchboard short circuit…)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <span className="mt-1 block text-[11px] text-slate-400">Add a description, a photo, or both.</span>
        </label>

        {/* attach photo */}
        <div>
          <span className="label">Attach issue photo (optional)</span>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
          {photo ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200">
              <img src={photo} alt="Issue" className="max-h-56 w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-900/70 text-white backdrop-blur"
                aria-label="Remove photo"
              >
                <IconX size={15} />
              </button>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-2 right-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-slate-700 backdrop-blur"
              >
                Replace
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 py-4 text-xs font-semibold text-slate-500 active:bg-slate-100"
            >
              <IconCamera size={15} /> Tap to add a photo of the damaged area
            </button>
          )}
        </div>

        {/* location */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-slate-700">
            <IconMapPin size={14} className="text-accent-600" /> Service Location
          </div>
          <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Area / city" />
        </div>

        {/* duration stepper */}
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
          <span className="text-sm font-bold text-slate-700">Estimated duration</span>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setDuration(Math.max(1, duration - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-500 active:bg-slate-100"><IconMinus size={14} /></button>
            <span className="w-14 text-center text-sm font-bold">{duration} hr{duration > 1 ? 's' : ''}</span>
            <button type="button" onClick={() => setDuration(Math.min(8, duration + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-slate-300 text-slate-500 active:bg-slate-100"><IconPlus size={14} /></button>
          </div>
        </div>

        <button className="btn-primary w-full" disabled={busy || !identified} onClick={run}>
          <IconSparkle size={15} /> {busy ? 'Matching…' : 'Run AI Worker Matching'} <IconArrowRight size={15} />
        </button>
      </div>
    </Sheet>
  );
}
