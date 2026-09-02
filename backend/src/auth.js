import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { db } from './db.js';
import { config } from './config.js';

// ---------------------------------------------------------------------------
// Minimal HS256 JSON Web Token, implemented on node:crypto so the backend
// keeps zero runtime dependencies.
// ---------------------------------------------------------------------------
const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64urlJson = (obj) => b64url(JSON.stringify(obj));
const fromB64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const sign = (data) => b64url(createHmac('sha256', config.authSecret).update(data).digest());

export function signToken(payload, { days = config.tokenTtlDays } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + days * 86400 };
  const head = b64urlJson({ alg: 'HS256', typ: 'JWT' });
  const claims = b64urlJson(body);
  return `${head}.${claims}.${sign(`${head}.${claims}`)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [head, claims, sig] = parts;
  const expected = sign(`${head}.${claims}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let body;
  try {
    body = JSON.parse(fromB64url(claims).toString('utf8'));
  } catch {
    return null;
  }
  if (body.exp && body.exp < Math.floor(Date.now() / 1000)) return null;
  return body;
}

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------
const userById = (id) => db.prepare('SELECT * FROM users WHERE userId = ?').get(id);

/** Attach req.user from a Bearer token when present. Never rejects. */
export function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const claims = verifyToken(token);
  if (claims?.sub) {
    const u = userById(claims.sub);
    if (u) req.user = { userId: u.userId, role: u.role, workerId: u.workerId || null, name: u.name };
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'authentication required' });
  if (!roles.includes(req.user.role))
    return res.status(403).json({ error: `requires role: ${roles.join(' / ')}` });
  next();
};

// ---------------------------------------------------------------------------
// OTP storage
// ---------------------------------------------------------------------------
export const sixDigit = () => String(randomInt(0, 1_000_000)).padStart(6, '0');

/**
 * Create a fresh OTP for an identifier, invalidating any earlier unconsumed
 * codes for it. Returns the plain code (caller delivers + optionally echoes it).
 */
export function issueOtp({ identifier, channel, purpose, payload = null }) {
  const now = new Date();
  db.prepare(
    "UPDATE otps SET consumedAt = ? WHERE identifier = ? AND consumedAt IS NULL"
  ).run(now.toISOString(), identifier);

  const code = sixDigit();
  db.prepare(
    `INSERT INTO otps (identifier, channel, code, purpose, payload, expiresAt, consumedAt, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
  ).run(
    identifier,
    channel,
    code,
    purpose,
    payload ? JSON.stringify(payload) : null,
    new Date(now.getTime() + config.otpTtlMin * 60 * 1000).toISOString(),
    now.toISOString()
  );
  return code;
}

/**
 * Validate + burn the latest OTP for an identifier.
 * Returns { purpose, payload } on success or throws an Error with a friendly message.
 */
export function consumeOtp(identifier, code) {
  const row = db
    .prepare(
      "SELECT * FROM otps WHERE identifier = ? AND consumedAt IS NULL ORDER BY id DESC LIMIT 1"
    )
    .get(identifier);
  if (!row) throw new Error('no active code — request a new one');
  if (new Date(row.expiresAt).getTime() < Date.now()) throw new Error('code expired — request a new one');
  if (String(code).trim() !== row.code) throw new Error('incorrect code');

  db.prepare('UPDATE otps SET consumedAt = ? WHERE id = ?').run(new Date().toISOString(), row.id);
  return { purpose: row.purpose, payload: row.payload ? JSON.parse(row.payload) : null };
}
