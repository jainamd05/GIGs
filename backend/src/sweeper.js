import { db, tx } from './db.js';
import { config } from './config.js';
import { logActivity } from './activity.js';
import { notifyAll } from './notify.js';

const CANCEL_REASON = 'No customer response within 48h';

/**
 * Soft-cancel every OPEN gig whose 48h response deadline has passed:
 * job -> CANCELLED (reason kept), its INTERESTED workers -> RELEASED. The gig
 * stays in the customer's history. Returns the number of gigs cancelled.
 */
export async function sweepExpiredGigs(now = new Date()) {
  const nowIso = now.toISOString();
  const expired = db
    .prepare(
      "SELECT * FROM jobs WHERE jobStatus = 'OPEN' AND expiresAt IS NOT NULL AND expiresAt <> '' AND expiresAt < ?"
    )
    .all(nowIso);
  if (!expired.length) return 0;

  for (const job of expired) {
    const interests = db.prepare("SELECT * FROM interests WHERE jobId = ? AND status = 'INTERESTED'").all(job.jobId);

    tx(() => {
      db.prepare("UPDATE jobs SET jobStatus = 'CANCELLED', cancelReason = ? WHERE jobId = ?").run(
        CANCEL_REASON,
        job.jobId
      );
      db.prepare("UPDATE interests SET status = 'RELEASED' WHERE jobId = ? AND status = 'INTERESTED'").run(job.jobId);
    });

    logActivity({
      kind: 'job',
      jobId: job.jobId,
      actor: job.customerName,
      message: `Gig ${job.jobId} auto-cancelled — ${CANCEL_REASON}; released ${interests.length} interested worker(s)`,
    });

    await notifyAll({
      email: job.customerEmail,
      phone: job.customerContact,
      subject: 'Your Sahayak request expired',
      body: `Your ${job.serviceType} request (${job.jobId}) was cancelled automatically because no worker was hired within 48 hours. You can create a new request any time.`,
      jobId: job.jobId,
    });
    for (const i of interests) {
      const w = db.prepare('SELECT * FROM workers WHERE workerId = ?').get(i.workerId);
      await notifyAll({
        email: w?.email,
        phone: w?.phoneno,
        subject: 'Job no longer available',
        body: `Job ${job.jobId} was withdrawn (the customer did not hire within 48 hours). You are free for other jobs.`,
        jobId: job.jobId,
      });
    }
  }
  return expired.length;
}

let timer = null;

/** Run the sweep once now, then on an interval. Safe to call once at boot. */
export function startSweeper() {
  const run = () =>
    sweepExpiredGigs()
      .then((n) => n && console.log(`[sweeper] auto-cancelled ${n} expired gig(s)`))
      .catch((err) => console.error('[sweeper]', err));
  run();
  if (timer) clearInterval(timer);
  timer = setInterval(run, config.sweepMs);
  if (typeof timer.unref === 'function') timer.unref();
}
