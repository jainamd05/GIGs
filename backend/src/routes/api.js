import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db, tx } from '../db.js';
import { config } from '../config.js';
import { logActivity, recentActivity } from '../activity.js';
import { notifyAll, integrationStatus } from '../notify.js';
import { requireRole } from '../auth.js';
import { createWorkerProfile } from '../users.js';
import {
  SERVICE_TYPES,
  normalizeServiceType,
  matchWorkers,
  workerEligibleForJob,
  cooldownExpiry,
} from '../matching.js';

export const api = Router();

const nowIso = () => new Date().toISOString();
const gigExpiry = (from = new Date()) =>
  new Date(from.getTime() + config.gigExpiryHours * 3600 * 1000).toISOString();

/** True when the caller is a customer whose account does not own this job. */
const customerBlocked = (req, job) =>
  req.user?.role === 'customer' &&
  job.customerUserId &&
  job.customerUserId !== req.user.userId;
const jobById = (id) => db.prepare('SELECT * FROM jobs WHERE jobId = ?').get(id);
const workerById = (id) => db.prepare('SELECT * FROM workers WHERE workerId = ?').get(id);
const hydrateJob = (j) => (j ? { ...j, shortlist: j.shortlist ? JSON.parse(j.shortlist) : [] } : j);
const hydrateInterest = (r) => {
  const w = workerById(r.workerId) || {};
  return {
    ...r,
    rating: w.rating,
    recentJobs: w.recentJobs,
    membershipScore: w.membershipScore,
    phoneno: w.phoneno,
    location: w.location,
    availability: w.availability,
    skill: w.skill,
  };
};

const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

// ---------------------------------------------------------------------------
// POST /create-gig  — customer submits a new service request
// ---------------------------------------------------------------------------
api.post('/create-gig', async (req, res) => {
  const b = req.body || {};
  const required = ['customerName', 'customerContact', 'serviceType', 'location'];
  const missing = required.filter((k) => !b[k]);
  if (missing.length) return bad(res, `missing fields: ${missing.join(', ')}`);

  const serviceType = normalizeServiceType(b.serviceType);
  if (!SERVICE_TYPES.includes(serviceType))
    return bad(res, `serviceType must be one of ${SERVICE_TYPES.join(', ')}`);

  // Optional issue photo — accept only a reasonably-sized image data URL.
  let photoData = '';
  if (b.photo) {
    if (typeof b.photo !== 'string' || !/^data:image\/(png|jpe?g|webp);base64,/.test(b.photo))
      return bad(res, 'photo must be a PNG/JPEG/WebP data URL');
    if (b.photo.length > 8 * 1024 * 1024) return bad(res, 'photo is too large (max ~6MB)');
    photoData = b.photo;
  }

  const jobId = `J-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 4)}`;
  const createdAt = nowIso();
  const expiresAt = gigExpiry(new Date(createdAt));
  const customerUserId = req.user?.role === 'customer' ? req.user.userId : null;

  const { eligible, rejected } = matchWorkers({ serviceType, location: b.location });
  const shortlist = eligible.map((w) => w.workerId);

  db.prepare(
    `INSERT INTO jobs
      (jobId, customerName, customerEmail, customerContact, serviceType, location,
       description, preferredTime, jobStatus, createdAt, assignedWorkerId, shortlist,
       customerUserId, expiresAt, photoData)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, NULL, ?, ?, ?, ?)`
  ).run(
    jobId,
    b.customerName,
    b.customerEmail || '',
    b.customerContact,
    serviceType,
    b.location,
    b.description || '',
    b.preferredTime || '',
    createdAt,
    JSON.stringify(shortlist),
    customerUserId,
    expiresAt,
    photoData
  );

  logActivity({
    kind: 'job',
    jobId,
    actor: b.customerName,
    message: `New ${serviceType} request in ${b.location} — ${eligible.length} eligible worker(s) notified`,
  });

  // Notify eligible workers (n8n: "Email Eligible Workers")
  for (const w of eligible) {
    await notifyAll({
      email: w.email,
      phone: w.phoneno,
      subject: `New ${serviceType} job near you`,
      body: `Job ${jobId} in ${b.location}${b.preferredTime ? ` (preferred: ${b.preferredTime})` : ''}. Open the Sahayak app to express interest.`,
      jobId,
    });
  }

  // Notify customer (n8n: "Notify Customer Request Sent")
  await notifyAll({
    email: b.customerEmail,
    phone: b.customerContact,
    subject: 'Sahayak request received',
    body: `Your ${serviceType} request (${jobId}) was sent to ${eligible.length} cooperative worker(s). You'll be notified as they express interest.`,
    jobId,
  });

  res.json({
    jobId,
    jobStatus: 'OPEN',
    message: 'Gig request received.',
    notifiedWorkers: shortlist,
    eligibleCount: eligible.length,
    skippedWorkers: rejected,
    expiresAt,
  });
});

// ---------------------------------------------------------------------------
// POST /worker-accept  — worker expresses interest
// ---------------------------------------------------------------------------
api.post('/worker-accept', async (req, res) => {
  const b = req.body || {};
  if (!b.jobId || !b.workerId) return bad(res, 'jobId and workerId are required');

  const job = jobById(b.jobId);
  if (!job) return bad(res, 'unknown jobId', 404);
  if (job.jobStatus !== 'OPEN') return bad(res, `job is ${job.jobStatus}, not accepting interest`);

  const worker = workerById(b.workerId);
  if (!worker) return bad(res, 'unknown workerId', 404);

  if (req.user?.role === 'worker' && req.user.workerId !== b.workerId)
    return bad(res, 'you can only express interest as yourself', 403);
  if (req.user?.role === 'customer') return bad(res, 'customers cannot express interest', 403);

  const workerName = b.workerName || worker.name;
  const workerEmail = b.workerEmail || worker.email;
  const serviceType = normalizeServiceType(b.serviceType || job.serviceType);

  try {
    db.prepare(
      `INSERT INTO interests (jobId, workerId, workerName, workerEmail, serviceType, status, acceptedAt)
       VALUES (?, ?, ?, ?, ?, 'INTERESTED', ?)`
    ).run(b.jobId, b.workerId, workerName, workerEmail, serviceType, nowIso());
  } catch (err) {
    if (String(err.message).includes('UNIQUE'))
      return res.json({ jobId: b.jobId, workerId: b.workerId, status: 'interest_recorded', note: 'already recorded' });
    throw err;
  }

  // NOTE: unlike the original n8n flow we do NOT mark the worker Busy here
  // (project-context gap #9). Availability only changes on hire.
  logActivity({ kind: 'interest', jobId: b.jobId, actor: workerName, message: `${workerName} expressed interest in ${b.jobId}` });

  await notifyAll({
    email: job.customerEmail,
    phone: job.customerContact,
    subject: 'A worker is interested',
    body: `${workerName} expressed interest in your ${job.serviceType} request (${b.jobId}). Review interested workers and choose one.`,
    jobId: b.jobId,
  });

  res.json({ jobId: b.jobId, workerId: b.workerId, status: 'interest_recorded' });
});

// ---------------------------------------------------------------------------
// POST /gig-interested-workers  — list workers who expressed interest
// ---------------------------------------------------------------------------
api.post('/gig-interested-workers', (req, res) => {
  const jobId = (req.body || {}).jobId;
  if (!jobId) return bad(res, 'jobId is required');
  const rows = db
    .prepare('SELECT * FROM interests WHERE jobId = ? ORDER BY acceptedAt ASC')
    .all(jobId)
    .map(hydrateInterest);
  res.json({ jobId, workers: rows });
});

// ---------------------------------------------------------------------------
// POST /customer-hire  — customer picks a worker; assignment pipeline runs
// ---------------------------------------------------------------------------
api.post('/customer-hire', async (req, res) => {
  const b = req.body || {};
  const chosenWorkerId = b.chosenWorkerId || b.workerId;
  if (!b.jobId || !chosenWorkerId) return bad(res, 'jobId and chosenWorkerId are required');

  const job = jobById(b.jobId);
  if (!job) return bad(res, 'unknown jobId', 404);
  if (customerBlocked(req, job)) return bad(res, 'this gig belongs to another account', 403);
  if (job.jobStatus === 'CANCELLED') return bad(res, 'gig was cancelled');
  if (job.jobStatus === 'ASSIGNED') return bad(res, 'job already assigned');

  const interests = db.prepare('SELECT * FROM interests WHERE jobId = ?').all(b.jobId);
  const chosenInterest = interests.find((i) => i.workerId === chosenWorkerId);
  if (!chosenInterest) return bad(res, 'chosen worker has not expressed interest in this job');

  const chosenWorker = workerById(chosenWorkerId);

  tx(() => {
    db.prepare("UPDATE interests SET status = 'HIRED' WHERE jobId = ? AND workerId = ?").run(b.jobId, chosenWorkerId);
    db.prepare("UPDATE interests SET status = 'RELEASED' WHERE jobId = ? AND workerId != ?").run(b.jobId, chosenWorkerId);

    db.prepare("UPDATE jobs SET jobStatus = 'ASSIGNED', assignedWorkerId = ? WHERE jobId = ?").run(chosenWorkerId, b.jobId);

    // Chosen worker: busy now + 12h fairness cooldown (n8n: "Set 12h Cooldown On Worker")
    db.prepare("UPDATE workers SET availability = 'Busy', cooldownUntil = ? WHERE workerId = ?").run(
      cooldownExpiry(),
      chosenWorkerId
    );
  });

  const releasedNames = interests.filter((i) => i.workerId !== chosenWorkerId).map((i) => i.workerName);

  logActivity({
    kind: 'hire',
    jobId: b.jobId,
    actor: job.customerName,
    message: `${chosenWorker.name} hired for ${b.jobId}; released ${releasedNames.length} other applicant(s)`,
  });

  await notifyAll({
    email: chosenWorker.email,
    phone: chosenWorker.phoneno,
    subject: "You've been assigned a job",
    body: `You were selected for ${job.serviceType} job ${b.jobId} in ${job.location}. Contact ${job.customerName} at ${job.customerContact}. A 12h cooldown now applies for fair distribution.`,
    jobId: b.jobId,
  });
  await notifyAll({
    email: job.customerEmail,
    phone: job.customerContact,
    subject: 'Worker assigned',
    body: `${chosenWorker.name} (${chosenWorker.phoneno}) has been assigned to your ${job.serviceType} request ${b.jobId}.`,
    jobId: b.jobId,
  });
  for (const i of interests.filter((i) => i.workerId !== chosenWorkerId)) {
    const w = workerById(i.workerId);
    await notifyAll({
      email: w?.email,
      phone: w?.phoneno,
      subject: 'Job filled',
      body: `Job ${b.jobId} has been assigned to another worker. You are free for other jobs — thanks for your interest.`,
      jobId: b.jobId,
    });
  }

  res.json({ jobId: b.jobId, workerId: chosenWorkerId, workerName: chosenWorker.name, status: 'assigned' });
});

// ---------------------------------------------------------------------------
// POST /new_worker  — cooperative worker sign-up (project-context §6, fixed)
// ---------------------------------------------------------------------------
api.post('/new_worker', async (req, res) => {
  const b = req.body || {};

  let workerId;
  try {
    workerId = createWorkerProfile(b);
  } catch (err) {
    return bad(res, err.message);
  }
  const skill = normalizeServiceType(b.skill);

  logActivity({ kind: 'signup', actor: b.name, message: `${b.name} joined as a ${skill} worker in ${b.location}` });

  await notifyAll({
    email: b.email,
    phone: b.phoneno || b.phone,
    subject: 'Welcome to Sahayak',
    body: `Your worker profile (${workerId}) is active. You'll receive ${skill} jobs matching your location.`,
  });

  res.json({ workerId, status: 'worker_registered', message: 'Worker profile created.' });
});

// ---------------------------------------------------------------------------
// Lifecycle events the original n8n workflow never handled (gap #7)
// ---------------------------------------------------------------------------
api.post('/job-complete', async (req, res) => {
  const b = req.body || {};
  const job = jobById(b.jobId);
  if (!job) return bad(res, 'unknown jobId', 404);
  if (customerBlocked(req, job)) return bad(res, 'this gig belongs to another account', 403);
  if (!job.assignedWorkerId) return bad(res, 'job has no assigned worker');

  db.prepare("UPDATE jobs SET jobStatus = 'COMPLETED' WHERE jobId = ?").run(b.jobId);
  db.prepare(
    "UPDATE workers SET availability = 'Available', recentJobs = recentJobs + 1 WHERE workerId = ?"
  ).run(job.assignedWorkerId);
  logActivity({ kind: 'job', jobId: b.jobId, message: `Job ${b.jobId} marked COMPLETED (cooldown still applies until it expires)` });

  const w = workerById(job.assignedWorkerId);
  await notifyAll({
    email: job.customerEmail,
    phone: job.customerContact,
    subject: 'Job completed',
    body: `Your ${job.serviceType} job ${b.jobId} is complete. Please rate ${w?.name}.`,
    jobId: b.jobId,
  });
  res.json({ jobId: b.jobId, status: 'completed' });
});

api.post('/payment-complete', async (req, res) => {
  const b = req.body || {};
  const job = jobById(b.jobId);
  if (!job) return bad(res, 'unknown jobId', 404);
  if (customerBlocked(req, job)) return bad(res, 'this gig belongs to another account', 403);
  const amount = Number(b.amount);
  if (!amount || amount <= 0) return bad(res, 'amount must be a positive number');

  db.prepare('INSERT INTO payments (jobId, amount, method, paidAt) VALUES (?, ?, ?, ?)').run(
    b.jobId,
    amount,
    b.method || 'UPI',
    nowIso()
  );
  logActivity({ kind: 'payment', jobId: b.jobId, actor: job.customerName, message: `Payment of ₹${amount} (${b.method || 'UPI'}) recorded for ${b.jobId}` });

  const w = job.assignedWorkerId ? workerById(job.assignedWorkerId) : null;
  await notifyAll({
    email: w?.email,
    phone: w?.phoneno,
    subject: 'Payment received',
    body: `₹${amount} for job ${b.jobId} has been paid by ${job.customerName}.`,
    jobId: b.jobId,
  });
  res.json({ jobId: b.jobId, amount, status: 'payment_recorded' });
});

api.post('/rating-submit', async (req, res) => {
  const b = req.body || {};
  const job = jobById(b.jobId);
  if (!job) return bad(res, 'unknown jobId', 404);
  if (customerBlocked(req, job)) return bad(res, 'this gig belongs to another account', 403);
  const workerId = b.workerId || job.assignedWorkerId;
  const worker = workerById(workerId);
  if (!worker) return bad(res, 'unknown workerId', 404);
  const rating = Number(b.rating);
  if (!(rating >= 1 && rating <= 5)) return bad(res, 'rating must be 1-5');

  db.prepare('INSERT INTO ratings (jobId, workerId, rating, feedback, ratedAt) VALUES (?, ?, ?, ?, ?)').run(
    b.jobId,
    workerId,
    rating,
    b.feedback || '',
    nowIso()
  );
  const newCount = worker.ratingCount + 1;
  const newAvg = (worker.rating * worker.ratingCount + rating) / newCount;
  db.prepare('UPDATE workers SET rating = ?, ratingCount = ? WHERE workerId = ?').run(
    Math.round(newAvg * 100) / 100,
    newCount,
    workerId
  );
  logActivity({ kind: 'rating', jobId: b.jobId, actor: job.customerName, message: `${worker.name} rated ${rating}/5 for ${b.jobId}` });
  res.json({ jobId: b.jobId, workerId, newRating: Math.round(newAvg * 100) / 100, status: 'rating_recorded' });
});

// ---------------------------------------------------------------------------
// Read endpoints for the frontend / admin dashboard
// ---------------------------------------------------------------------------
api.get('/health', (_req, res) =>
  res.json({ ok: true, integrations: integrationStatus(), cooldownHours: config.cooldownHours })
);
api.get('/service-types', (_req, res) => res.json({ serviceTypes: SERVICE_TYPES }));
api.get('/integrations', (_req, res) => res.json(integrationStatus()));

api.get('/jobs', (req, res) => {
  const { status, customer } = req.query;
  let rows = db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC').all();
  if (status) rows = rows.filter((j) => j.jobStatus === status);
  if (customer) rows = rows.filter((j) => j.customerName?.toLowerCase() === String(customer).toLowerCase());
  res.json({ jobs: rows.map(hydrateJob) });
});

api.get('/jobs/:id', (req, res) => {
  const job = hydrateJob(jobById(req.params.id));
  if (!job) return bad(res, 'unknown jobId', 404);
  if (customerBlocked(req, job)) return bad(res, 'this gig belongs to another account', 403);
  const interests = db
    .prepare('SELECT * FROM interests WHERE jobId = ? ORDER BY acceptedAt ASC')
    .all(job.jobId)
    .map(hydrateInterest);
  const payments = db.prepare('SELECT * FROM payments WHERE jobId = ?').all(job.jobId);
  const ratings = db.prepare('SELECT * FROM ratings WHERE jobId = ?').all(job.jobId);
  res.json({ job, interests, payments, ratings });
});

// ---------------------------------------------------------------------------
// Customer-scoped reads (mobile app). Require a customer token; a customer
// only ever sees their own gigs and the workers who responded to them.
// ---------------------------------------------------------------------------
const jobsForCustomer = (user) =>
  db
    .prepare(
      `SELECT * FROM jobs
        WHERE customerUserId = ?
           OR (customerUserId IS NULL AND lower(customerName) = lower(?))
        ORDER BY createdAt DESC`
    )
    .all(user.userId, user.name || '')
    .map(hydrateJob);

api.get('/me/jobs', requireRole('customer'), (req, res) => {
  res.json({ jobs: jobsForCustomer(req.user) });
});

api.get('/me/interested-workers', requireRole('customer'), (req, res) => {
  const openGigs = jobsForCustomer(req.user).filter((j) => j.jobStatus === 'OPEN');
  const groups = openGigs.map((job) => ({
    job,
    workers: db
      .prepare("SELECT * FROM interests WHERE jobId = ? AND status = 'INTERESTED' ORDER BY acceptedAt ASC")
      .all(job.jobId)
      .map(hydrateInterest),
  }));
  res.json({
    groups,
    totalInterested: groups.reduce((n, g) => n + g.workers.length, 0),
  });
});

api.get('/workers', (req, res) => {
  const { skill } = req.query;
  let rows = db.prepare('SELECT * FROM workers ORDER BY createdAt ASC').all();
  if (skill) rows = rows.filter((w) => w.skill === normalizeServiceType(skill));
  const now = Date.now();
  res.json({
    workers: rows.map((w) => ({
      ...w,
      onCooldown: w.cooldownUntil ? new Date(w.cooldownUntil).getTime() > now : false,
    })),
  });
});

api.get('/workers/:id/jobs', (req, res) => {
  const wid = req.params.id;
  if (req.user?.role === 'worker' && req.user.workerId !== wid)
    return bad(res, 'you can only view your own jobs', 403);
  if (req.user?.role === 'customer') return bad(res, 'not available for customers', 403);
  const worker = workerById(wid);
  const open = db
    .prepare("SELECT * FROM jobs WHERE jobStatus = 'OPEN' ORDER BY createdAt DESC")
    .all()
    .map(hydrateJob);
  const myInterests = db.prepare('SELECT jobId, status FROM interests WHERE workerId = ?').all(wid);
  const assigned = db.prepare('SELECT * FROM jobs WHERE assignedWorkerId = ? ORDER BY createdAt DESC').all(wid).map(hydrateJob);
  res.json({
    openJobs: open.map((j) => {
      // "matched" reflects the worker's CURRENT eligibility, not the job's
      // frozen shortlist — so a worker who joined after the job was posted can
      // still see and accept jobs they qualify for.
      const { eligible, reason } = workerEligibleForJob(worker, j);
      return {
        ...j,
        matched: eligible,
        matchReason: reason,
        notifiedInitially: j.shortlist.includes(wid),
        myStatus: myInterests.find((i) => i.jobId === j.jobId)?.status || null,
      };
    }),
    assignedJobs: assigned,
  });
});

api.get('/activity', (req, res) => res.json({ activity: recentActivity(Number(req.query.limit) || 100) }));

api.get('/stats', (_req, res) => {
  const g = (q) => db.prepare(q).get().c;
  res.json({
    jobs: {
      total: g('SELECT COUNT(*) c FROM jobs'),
      open: g("SELECT COUNT(*) c FROM jobs WHERE jobStatus='OPEN'"),
      assigned: g("SELECT COUNT(*) c FROM jobs WHERE jobStatus='ASSIGNED'"),
      completed: g("SELECT COUNT(*) c FROM jobs WHERE jobStatus='COMPLETED'"),
    },
    workers: {
      total: g('SELECT COUNT(*) c FROM workers'),
      available: g("SELECT COUNT(*) c FROM workers WHERE availability='Available'"),
      onCooldown: db.prepare('SELECT COUNT(*) c FROM workers WHERE cooldownUntil > ?').get(nowIso()).c,
    },
    revenue: db.prepare('SELECT COALESCE(SUM(amount),0) c FROM payments').get().c,
  });
});
