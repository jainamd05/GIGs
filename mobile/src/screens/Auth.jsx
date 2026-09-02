import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Field, Banner } from '../ui.jsx';
import { IconShield, IconUser, IconWrench, IconChart, IconArrowRight, IconMail } from '../icons.jsx';
import { SERVICE_TYPES } from '../lib.js';

const ROLES = [
  { id: 'customer', label: 'Customer', icon: IconUser, blurb: 'Book verified craftsmen' },
  { id: 'worker', label: 'Worker', icon: IconWrench, blurb: 'Find cooperative jobs' },
  { id: 'admin', label: 'Admin', icon: IconChart, blurb: 'Operations dashboard' },
];

const EMPTY = { name: '', contact: '', location: 'Rajkot', skill: 'Plumbing', inviteCode: '' };

export default function Auth() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState('login'); // login | signup
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState(EMPTY);
  const [step, setStep] = useState('form'); // form | otp
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState('email');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const reset = (next) => { setStep('form'); setCode(''); setErr(''); if (next) setMode(next); };

  const sendCode = async (e) => {
    e?.preventDefault();
    setErr('');
    if (!form.contact.trim()) return setErr('Enter your email or phone number');
    if (mode === 'signup' && !form.name.trim()) return setErr('Enter your name');
    setBusy(true);
    try {
      const payload =
        mode === 'login'
          ? { identifier: form.contact, mode: 'login' }
          : {
              identifier: form.contact,
              mode: 'signup',
              role,
              name: form.name,
              location: form.location,
              ...(role === 'worker' ? { skill: form.skill } : {}),
              ...(role === 'admin' ? { inviteCode: form.inviteCode } : {}),
            };
      const r = await api.requestOtp(payload);
      setChannel(r.channel);
      setStep('otp');
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e?.preventDefault();
    setErr('');
    if (code.trim().length < 4) return setErr('Enter the code you received');
    setBusy(true);
    try {
      const { token, user, worker } = await api.verifyOtp(form.contact, code.trim());
      signIn(token, user, worker);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      <div className="bg-grad-brand px-6 pb-10 pt-10 text-white">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest">
          <IconShield size={12} /> Sahayak
        </span>
        <h1 className="mt-3 font-display text-2xl font-semibold leading-tight">
          {step === 'otp' ? 'Enter your code' : mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p className="mt-1 text-sm text-white/85">
          {step === 'otp'
            ? `We sent a 6-digit code to your ${channel === 'email' ? 'email' : 'phone'}.`
            : 'Cooperative gig-work with guaranteed fair wages.'}
        </p>
      </div>

      <div className="space-y-4 px-4 pb-10 pt-5">
        {step === 'form' && (
          <>
            {/* login / signup toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-card">
              {['login', 'signup'].map((m) => (
                <button
                  key={m}
                  onClick={() => reset(m)}
                  className={`rounded-xl py-2 text-sm font-bold transition-colors ${
                    mode === m ? 'bg-brand-600 text-white' : 'text-slate-500'
                  }`}
                >
                  {m === 'login' ? 'Log in' : 'Sign up'}
                </button>
              ))}
            </div>

            <form onSubmit={sendCode} className="card space-y-3">
              {mode === 'signup' && (
                <>
                  <div>
                    <span className="label">I am a…</span>
                    <div className="grid grid-cols-3 gap-2">
                      {ROLES.map((r) => {
                        const RIcon = r.icon;
                        const on = role === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => setRole(r.id)}
                            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2.5 text-[11px] font-bold ${
                              on ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'
                            }`}
                          >
                            <RIcon size={17} />
                            {r.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">{ROLES.find((r) => r.id === role)?.blurb}</p>
                  </div>

                  <Field label="Full name" placeholder="e.g. Priya Sharma" value={form.name} onChange={set('name')} />
                </>
              )}

              <Field
                label="Email or phone"
                placeholder="you@example.com  or  +9198…"
                hint="Your one-time code is sent here."
                value={form.contact}
                onChange={set('contact')}
              />

              {mode === 'signup' && (
                <>
                  <Field label="Area / city" placeholder="e.g. Rajkot" value={form.location} onChange={set('location')} />
                  {role === 'worker' && (
                    <Field label="Primary skill" options={SERVICE_TYPES} value={form.skill} onChange={set('skill')} />
                  )}
                  {role === 'admin' && (
                    <Field
                      label="Admin invite code"
                      placeholder="Provided by your operator"
                      value={form.inviteCode}
                      onChange={set('inviteCode')}
                    />
                  )}
                </>
              )}

              {err && <Banner tone="error">{err}</Banner>}

              <button className="btn-primary w-full" disabled={busy}>
                <IconMail size={15} /> {busy ? 'Sending…' : 'Send code'} <IconArrowRight size={15} />
              </button>
            </form>

            <p className="px-2 text-center text-[11px] text-slate-400">
              No passwords. We verify you with a one-time code each time you sign in.
            </p>
          </>
        )}

        {step === 'otp' && (
          <form onSubmit={verify} className="card space-y-3">
            <div className="text-sm font-bold text-slate-700">
              Code sent to <span className="text-brand-700">{form.contact}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Check your {channel === 'email' ? 'email inbox' : 'SMS and WhatsApp'} for the 6-digit code.
            </p>
            <Field
              label="6-digit code"
              inputMode="numeric"
              placeholder="••••••"
              className="text-center font-mono text-lg tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            {err && <Banner tone="error">{err}</Banner>}
            <button className="btn-primary w-full" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify & continue'} <IconArrowRight size={15} />
            </button>
            <div className="flex items-center justify-between text-[11px] font-bold">
              <button type="button" className="text-slate-500" onClick={() => reset()}>
                ← Change details
              </button>
              <button type="button" className="text-brand-600 disabled:opacity-40" disabled={busy} onClick={sendCode}>
                Resend code
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
