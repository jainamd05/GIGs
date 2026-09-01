import { db } from './db.js';
import { config } from './config.js';

export const SERVICE_TYPES = ['Plumbing', 'Electrician', 'Cleaning', 'Carpentry'];

/** Normalise loose client input to one of the canonical service types. */
export function normalizeServiceType(input) {
  if (!input) return input;
  const v = String(input).trim().toLowerCase();
  const map = {
    plumbing: 'Plumbing', plumber: 'Plumbing', plumb: 'Plumbing',
    electrician: 'Electrician', electrical: 'Electrician', electric: 'Electrician',
    cleaning: 'Cleaning', cleaner: 'Cleaning', clean: 'Cleaning',
    carpentry: 'Carpentry', carpenter: 'Carpentry', carpented: 'Carpentry',
  };
  return map[v] || String(input).trim();
}

const locMatch = (a, b) => {
  const x = (a || '').trim().toLowerCase();
  const y = (b || '').trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
};

export function isOnCooldown(worker, now = new Date()) {
  if (!worker.cooldownUntil) return false;
  return new Date(worker.cooldownUntil).getTime() > now.getTime();
}

/**
 * Replicates the n8n chain:
 *   Find Workers By Skill -> Filter Eligible Workers -> Filter Out Cooldown
 * Returns { eligible, rejected } where rejected carries a reason for the admin UI.
 */
export function matchWorkers({ serviceType, location }) {
  const now = new Date();
  const pool = db.prepare('SELECT * FROM workers WHERE skill = ?').all(serviceType);

  const eligible = [];
  const rejected = [];
  for (const w of pool) {
    if (w.availability !== 'Available') {
      rejected.push({ workerId: w.workerId, name: w.name, reason: 'not available' });
      continue;
    }
    if (String(w.isActiveMember).toLowerCase() !== 'yes') {
      rejected.push({ workerId: w.workerId, name: w.name, reason: 'inactive membership' });
      continue;
    }
    if (!locMatch(w.location, location)) {
      rejected.push({ workerId: w.workerId, name: w.name, reason: `location ${w.location} != ${location}` });
      continue;
    }
    if (isOnCooldown(w, now)) {
      rejected.push({ workerId: w.workerId, name: w.name, reason: `cooldown until ${w.cooldownUntil}` });
      continue;
    }
    eligible.push(w);
  }

  // Fairness ordering: least recent jobs first, then highest membership score, then rating.
  eligible.sort(
    (a, b) =>
      a.recentJobs - b.recentJobs ||
      b.membershipScore - a.membershipScore ||
      b.rating - a.rating
  );

  return { eligible, rejected };
}

export function cooldownExpiry(now = new Date()) {
  return new Date(now.getTime() + config.cooldownHours * 3600 * 1000).toISOString();
}
