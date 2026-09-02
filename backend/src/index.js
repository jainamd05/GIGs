import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { seedIfEmpty, seedAuth } from './db.js';
import { api } from './routes/api.js';
import { auth as authRouter } from './routes/auth.js';
import { attachUser } from './auth.js';
import { startSweeper } from './sweeper.js';
import { integrationStatus } from './notify.js';

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

const seeded = seedIfEmpty();
const seededAdmin = seedAuth();

const app = express();
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
// Larger limit so a customer can attach a (downscaled) issue photo as a data URL.
app.use(express.json({ limit: '8mb' }));

app.use((req, _res, next) => {
  if (req.method === 'POST') {
    // Keep the log readable when the body carries a base64 image.
    const body = JSON.stringify(req.body, (k, v) =>
      typeof v === 'string' && v.length > 300 ? `${v.slice(0, 60)}…[${v.length} chars]` : v
    );
    console.log(`--> ${req.method} ${req.path}`, body);
  }
  next();
});

// Resolve req.user from a Bearer token when one is supplied. Token-less
// requests continue to work (public reads, the smoke script, the n8n paths).
app.use(attachUser);

// Auth (OTP login / signup / profile)
app.use('/auth', authRouter);
app.use('/webhook/auth', authRouter);

// Mount the same routes at "/" and at "/webhook" so the paths match the
// original n8n webhook URLs (…/webhook/create-gig) as well as plain REST.
app.use('/', api);
app.use('/webhook', api);

app.get('/', (_req, res) =>
  res.json({
    name: 'Sahayak backend',
    endpoints: [
      'POST /create-gig',
      'POST /worker-accept',
      'POST /gig-interested-workers',
      'POST /customer-hire',
      'POST /new_worker',
      'POST /job-complete',
      'POST /payment-complete',
      'POST /rating-submit',
      'POST /auth/request-otp, /auth/verify-otp',
      'GET  /auth/me   PATCH /auth/me',
      'GET  /me/jobs, /me/interested-workers   (customer token)',
      'GET  /jobs, /jobs/:id, /workers, /workers/:id/jobs, /activity, /stats, /health',
    ],
  })
);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(config.port, () => {
  console.log(`\nSahayak backend on http://localhost:${config.port}`);
  console.log(`  cooldown: ${config.cooldownHours}h   seeded workers: ${seeded ? 'yes' : 'already present'}`);
  console.log(`  admin account: ${seededAdmin ? `seeded (${config.adminEmail})` : 'already present'}`);
  console.log(`  gig expiry: ${config.gigExpiryHours}h   sweep every ${Math.round(config.sweepMs / 1000)}s`);
  console.log(`  integrations:`, integrationStatus());
  startSweeper();
});
