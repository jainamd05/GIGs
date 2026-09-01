// Force re-seed: wipes all tables and reloads seed/workers.json.
import { db, seedIfEmpty } from '../src/db.js';

for (const t of ['activity', 'ratings', 'payments', 'interests', 'jobs', 'workers']) {
  db.exec(`DELETE FROM ${t};`);
}
const ok = seedIfEmpty();
console.log(ok ? 'Re-seeded workers from seed/workers.json' : 'Seed skipped (no seed file?)');
