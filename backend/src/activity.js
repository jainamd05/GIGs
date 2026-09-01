import { db } from './db.js';

/** Append a row to the activity feed and echo it to the console. */
export function logActivity({ kind, channel = null, jobId = null, actor = null, message, simulated = false }) {
  const ts = new Date().toISOString();
  const tag = simulated ? 'SIMULATED' : 'LIVE';
  console.log(`[activity ${tag}] ${kind}${channel ? '/' + channel : ''} :: ${message}`);
  try {
    db.prepare(
      `INSERT INTO activity (ts, kind, channel, jobId, actor, message, simulated)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(ts, kind, channel, jobId, actor, message, simulated ? 1 : 0);
  } catch (err) {
    // Never let an activity-log write take down a request or a notification.
    console.error(`[activity] failed to persist: ${err.message}`);
  }
}

export function recentActivity(limit = 100) {
  return db
    .prepare('SELECT * FROM activity ORDER BY id DESC LIMIT ?')
    .all(limit)
    .map((r) => ({ ...r, simulated: Boolean(r.simulated) }));
}
