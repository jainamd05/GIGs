import { Router } from 'express';
import { db } from '../db.js';
import { config } from '../config.js';
import { logActivity } from '../activity.js';
import { notifyAll } from '../notify.js';
import { SERVICE_TYPES } from '../matching.js';
import {
  signToken,
  requireAuth,
  issueOtp,
  consumeOtp,
} from '../auth.js';
import {
  normalizeIdentifier,
  findUserByIdentifier,
  createUser,
  publicUser,
} from '../users.js';

export const auth = Router();

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });
const ROLES = ['customer', 'worker', 'admin'];

const workerFor = (u) =>
  u?.workerId ? db.prepare('SELECT * FROM workers WHERE workerId = ?').get(u.workerId) : null;

// ---------------------------------------------------------------------------
// POST /auth/request-otp  — start a login or signup; delivers a 6-digit code
// ---------------------------------------------------------------------------
auth.post('/request-otp', async (req, res) => {
  const b = req.body || {};
  const mode = b.mode === 'signup' ? 'signup' : 'login';
  const { identifier, channel } = normalizeIdentifier(b.identifier);
  if (!identifier || !channel) return bad(res, 'enter a valid email or phone number');

  const existing = findUserByIdentifier(identifier);
  let payload = null;

  if (mode === 'login') {
    if (!existing) return bad(res, 'no account for that email/phone — sign up first', 404);
  } else {
    if (existing) return bad(res, 'an account already exists — log in instead', 409);
    const role = String(b.role || '').toLowerCase();
    if (!ROLES.includes(role)) return bad(res, `role must be one of ${ROLES.join(', ')}`);
    if (!b.name || !String(b.name).trim()) return bad(res, 'name is required');
    if (role === 'admin' && String(b.inviteCode || '').trim() !== config.adminInviteCode)
      return bad(res, 'invalid admin invite code', 403);
    if (role === 'worker' && !SERVICE_TYPES.includes(String(b.skill || '')))
      return bad(res, `skill must be one of ${SERVICE_TYPES.join(', ')}`);

    payload = {
      role,
      name: String(b.name).trim(),
      email: channel === 'email' ? identifier : normalizeIdentifier(b.email || '').identifier,
      phone: channel === 'sms' ? identifier : normalizeIdentifier(b.phone || '').identifier,
      location: String(b.location || '').trim(),
      skill: role === 'worker' ? b.skill : '',
    };
  }

  const code = issueOtp({ identifier, channel, purpose: mode, payload });

  const subject = 'Your Sahayak verification code';
  const body = `Your Sahayak ${mode} code is ${code}. It expires in ${config.otpTtlMin} minutes.`;

  // The code is delivered ONLY out-of-band: server terminal + email + SMS +
  // WhatsApp. It is never returned in this HTTP response.
  console.log(`\n=== SAHAYAK OTP ===  ${identifier} (${mode}) -> ${code}   [valid ${config.otpTtlMin} min]\n`);

  // Fire-and-forget so real SMTP/Twilio latency never blocks the login round-trip.
  notifyAll({
    email: channel === 'email' ? identifier : undefined,
    phone: channel === 'sms' ? identifier : undefined,
    subject,
    body,
  }).catch((err) => console.error('[auth] OTP notify failed:', err.message));
  logActivity({ kind: 'signup', actor: identifier, message: `OTP (${mode}) issued to ${identifier}` });

  res.json({ sent: true, mode, channel, identifier });
});

// ---------------------------------------------------------------------------
// POST /auth/verify-otp  — exchange a code for a session token
// ---------------------------------------------------------------------------
auth.post('/verify-otp', (req, res) => {
  const b = req.body || {};
  const { identifier } = normalizeIdentifier(b.identifier);
  if (!identifier) return bad(res, 'enter a valid email or phone number');
  if (!b.code) return bad(res, 'enter the code');

  let result;
  try {
    result = consumeOtp(identifier, b.code);
  } catch (err) {
    return bad(res, err.message);
  }

  let user;
  let worker = null;
  if (result.purpose === 'signup') {
    if (findUserByIdentifier(identifier)) return bad(res, 'an account already exists — log in instead', 409);
    try {
      const created = createUser(result.payload || {});
      user = created.user;
      worker = created.worker;
    } catch (err) {
      return bad(res, err.message);
    }
    logActivity({ kind: 'signup', actor: user.name, message: `${user.name} signed up as ${user.role}` });
  } else {
    user = findUserByIdentifier(identifier);
    if (!user) return bad(res, 'account not found', 404);
    worker = workerFor(user);
  }

  const token = signToken({ sub: user.userId, role: user.role });
  res.json({ token, user: publicUser(user), worker });
});

// ---------------------------------------------------------------------------
// GET /auth/me  — current account (+ linked worker profile)
// ---------------------------------------------------------------------------
auth.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE userId = ?').get(req.user.userId);
  if (!user) return bad(res, 'account not found', 404);
  res.json({ user: publicUser(user), worker: workerFor(user) });
});

// ---------------------------------------------------------------------------
// PATCH /auth/me  — update mutable profile fields (name, location)
// ---------------------------------------------------------------------------
auth.patch('/me', requireAuth, (req, res) => {
  const b = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE userId = ?').get(req.user.userId);
  if (!user) return bad(res, 'account not found', 404);

  const name = b.name != null ? String(b.name).trim() : user.name;
  const location = b.location != null ? String(b.location).trim() : user.location;
  if (!name) return bad(res, 'name cannot be empty');

  db.prepare('UPDATE users SET name = ?, location = ? WHERE userId = ?').run(name, location, user.userId);
  if (user.workerId) {
    db.prepare('UPDATE workers SET name = ?, location = ? WHERE workerId = ?').run(name, location, user.workerId);
  }
  const fresh = db.prepare('SELECT * FROM users WHERE userId = ?').get(user.userId);
  res.json({ user: publicUser(fresh), worker: workerFor(fresh) });
});
