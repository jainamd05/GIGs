import { randomUUID } from 'node:crypto';
import { db } from './db.js';
import { SERVICE_TYPES, normalizeServiceType } from './matching.js';

const nowIso = () => new Date().toISOString();

/** Split a raw login/signup identifier into a normalized value + channel. */
export function normalizeIdentifier(raw) {
  const v = String(raw || '').trim();
  if (!v) return { identifier: '', channel: null };
  if (v.includes('@')) return { identifier: v.toLowerCase(), channel: 'email' };
  return { identifier: v.replace(/[^\d+]/g, ''), channel: 'sms' };
}

export function findUserByIdentifier(raw) {
  const { identifier, channel } = normalizeIdentifier(raw);
  if (!identifier) return null;
  return channel === 'email'
    ? db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(identifier)
    : db.prepare('SELECT * FROM users WHERE phone = ?').get(identifier);
}

export function userById(userId) {
  return db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
}

export function publicUser(u) {
  if (!u) return null;
  const { userId, role, name, email, phone, location, workerId, createdAt } = u;
  return { userId, role, name, email, phone, location, workerId: workerId || null, createdAt };
}

/**
 * Create a cooperative-worker row. Extracted from the /new_worker route so the
 * same validation + defaults back both that endpoint and worker signup.
 * Returns the created workerId. Throws Error on invalid input.
 */
export function createWorkerProfile(b = {}) {
  const required = ['name', 'skill', 'location'];
  const missing = required.filter((k) => !b[k]);
  if (missing.length) throw new Error(`missing fields: ${missing.join(', ')}`);

  const skill = normalizeServiceType(b.skill);
  if (!SERVICE_TYPES.includes(skill))
    throw new Error(`skill must be one of ${SERVICE_TYPES.join(', ')}`);

  const workerId = b.workerId || `W-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4)}`;
  db.prepare(
    `INSERT INTO workers
      (workerId, name, phoneno, email, skill, availability, location, isActiveMember,
       rating, ratingCount, recentJobs, membershipScore, cooldownUntil, createdAt)
     VALUES (?, ?, ?, ?, ?, 'Available', ?, ?, 5.0, 0, 0, ?, NULL, ?)`
  ).run(
    workerId,
    b.name,
    b.phoneno || b.phone || '',
    b.email || '',
    skill,
    b.location,
    (b.isActiveMember || 'yes').toLowerCase() === 'no' ? 'no' : 'yes',
    Number(b.membershipScore ?? 50),
    nowIso()
  );
  return workerId;
}

/**
 * Create an account. For role 'worker' also creates + links a worker profile
 * (pass `skill`). Returns { user, worker }.
 */
export function createUser({ role, name, email = '', phone = '', location = '', skill = '' }) {
  if (!['customer', 'worker', 'admin'].includes(role)) throw new Error('invalid role');
  if (!name) throw new Error('name is required');

  const { identifier: normEmail } = email ? normalizeIdentifier(email) : { identifier: '' };
  const { identifier: normPhone } = phone ? normalizeIdentifier(phone) : { identifier: '' };
  if (!normEmail && !normPhone) throw new Error('an email or phone is required');

  let workerId = null;
  let worker = null;
  if (role === 'worker') {
    workerId = createWorkerProfile({ name, email: normEmail, phoneno: normPhone, skill, location });
    worker = db.prepare('SELECT * FROM workers WHERE workerId = ?').get(workerId);
  }

  const userId = `U-${randomUUID().slice(0, 8).toUpperCase()}`;
  db.prepare(
    `INSERT INTO users (userId, role, name, email, phone, location, workerId, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(userId, role, name, normEmail, normPhone, location, workerId, nowIso());

  return { user: userById(userId), worker };
}
