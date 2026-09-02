// Force re-seed: wipes all tables and reloads seed/workers.json + the admin account.
import { db, seedIfEmpty, seedAuth } from '../src/db.js';

for (const t of ['activity', 'ratings', 'payments', 'interests', 'jobs', 'workers', 'users', 'otps']) {
  db.exec(`DELETE FROM ${t};`);
}
const ok = seedIfEmpty();
const admin = seedAuth();
console.log(ok ? 'Re-seeded workers from seed/workers.json' : 'Seed skipped (no seed file?)');
console.log(admin ? 'Re-seeded admin account' : 'Admin seed skipped');
