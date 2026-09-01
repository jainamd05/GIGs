import { DatabaseSync } from 'node:sqlite';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', config.dbFile);

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');
// Wait up to 5s for a competing writer instead of throwing "database is locked".
db.exec('PRAGMA busy_timeout = 5000;');

/**
 * Schema mirrors the three Google Sheets from the project context doc
 * (Jobs / Workers / Interests) plus small additions the model needs
 * (payments, ratings running-average, an activity feed).
 */
db.exec(`
CREATE TABLE IF NOT EXISTS workers (
  workerId       TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  phoneno        TEXT,
  email          TEXT,
  skill          TEXT NOT NULL,
  availability   TEXT NOT NULL DEFAULT 'Available',   -- Available | Busy
  location       TEXT NOT NULL,
  isActiveMember TEXT NOT NULL DEFAULT 'yes',         -- yes | no
  rating         REAL NOT NULL DEFAULT 5.0,
  ratingCount    INTEGER NOT NULL DEFAULT 0,
  recentJobs     INTEGER NOT NULL DEFAULT 0,
  membershipScore INTEGER NOT NULL DEFAULT 50,
  cooldownUntil  TEXT,                                -- ISO timestamp or NULL
  createdAt      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  jobId            TEXT PRIMARY KEY,
  customerName     TEXT NOT NULL,
  customerEmail    TEXT,
  customerContact  TEXT,
  serviceType      TEXT NOT NULL,
  location         TEXT NOT NULL,
  description      TEXT,
  preferredTime    TEXT,
  jobStatus        TEXT NOT NULL DEFAULT 'OPEN',      -- OPEN | ASSIGNED | COMPLETED | CANCELLED
  createdAt        TEXT NOT NULL,
  assignedWorkerId TEXT,
  shortlist        TEXT                                -- JSON array of workerIds notified
);

CREATE TABLE IF NOT EXISTS interests (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId       TEXT NOT NULL,
  workerId    TEXT NOT NULL,
  workerName  TEXT,
  workerEmail TEXT,
  serviceType TEXT,
  status      TEXT NOT NULL DEFAULT 'INTERESTED',     -- INTERESTED | HIRED | RELEASED
  acceptedAt  TEXT NOT NULL,
  UNIQUE (jobId, workerId)
);

CREATE TABLE IF NOT EXISTS payments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId     TEXT NOT NULL,
  amount    REAL NOT NULL,
  method    TEXT,
  paidAt    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ratings (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  jobId     TEXT NOT NULL,
  workerId  TEXT NOT NULL,
  rating    INTEGER NOT NULL,
  feedback  TEXT,
  ratedAt   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TEXT NOT NULL,
  kind      TEXT NOT NULL,       -- job | interest | hire | signup | notify | payment | rating
  channel   TEXT,                -- email | sms | whatsapp | system   (for notify rows)
  jobId     TEXT,
  actor     TEXT,
  message   TEXT NOT NULL,
  simulated INTEGER NOT NULL DEFAULT 0
);
`);

/** node:sqlite has no .transaction() helper; provide a minimal one. */
export function tx(fn) {
  db.exec('BEGIN');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

export function seedIfEmpty() {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM workers').get();
  if (c > 0) return false;

  const seedFile = join(__dirname, '..', 'seed', 'workers.json');
  if (!existsSync(seedFile)) return false;
  const workers = JSON.parse(readFileSync(seedFile, 'utf8'));
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO workers
      (workerId, name, phoneno, email, skill, availability, location,
       isActiveMember, rating, ratingCount, recentJobs, membershipScore, cooldownUntil, createdAt)
    VALUES
      (@workerId, @name, @phoneno, @email, @skill, @availability, @location,
       @isActiveMember, @rating, @ratingCount, @recentJobs, @membershipScore, @cooldownUntil, @createdAt)
  `);
  for (const w of workers) {
    stmt.run({
      workerId: w.workerId,
      name: w.name,
      phoneno: w.phoneno ?? '',
      email: w.email ?? '',
      skill: w.skill,
      availability: w.availability ?? 'Available',
      location: w.location,
      isActiveMember: w.isActiveMember ?? 'yes',
      rating: w.rating ?? 5.0,
      ratingCount: w.ratingCount ?? 0,
      recentJobs: w.recentJobs ?? 0,
      membershipScore: w.membershipScore ?? 50,
      cooldownUntil: w.cooldownUntil ?? null,
      createdAt: now,
    });
  }
  return true;
}
