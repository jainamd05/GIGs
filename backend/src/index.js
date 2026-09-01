import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { seedIfEmpty } from './db.js';
import { api } from './routes/api.js';
import { integrationStatus } from './notify.js';

process.on('unhandledRejection', (err) => console.error('[unhandledRejection]', err));
process.on('uncaughtException', (err) => console.error('[uncaughtException]', err));

const seeded = seedIfEmpty();

const app = express();
app.use(cors({ origin: config.corsOrigins.length ? config.corsOrigins : true }));
app.use(express.json());

app.use((req, _res, next) => {
  if (req.method === 'POST') console.log(`--> ${req.method} ${req.path}`, JSON.stringify(req.body));
  next();
});

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
  console.log(`  integrations:`, integrationStatus());
});
