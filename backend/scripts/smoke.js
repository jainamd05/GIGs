/**
 * End-to-end lifecycle check against a running backend.
 * Usage:  node scripts/smoke.js  (start the server first, or set BASE)
 */
const BASE = process.env.BASE || 'http://localhost:4000';

const post = async (path, body) => {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${path} -> ${r.status} ${JSON.stringify(j)}`);
  return j;
};
const get = async (path) => (await fetch(`${BASE}${path}`)).json();

const assert = (cond, msg) => {
  if (!cond) throw new Error('ASSERT FAILED: ' + msg);
  console.log('  ok -', msg);
};

const run = async () => {
  console.log('1. health');
  const h = await get('/health');
  assert(h.ok, 'server healthy');

  console.log('2. new worker signup');
  const nw = await post('/new_worker', {
    name: 'Test Plumber', skill: 'Plumbing', location: 'Rajkot',
    email: 'test.plumber@example.com', phoneno: '+919999999999',
  });
  assert(nw.workerId, 'worker registered ' + nw.workerId);

  console.log('3. create gig (Plumbing / Rajkot)');
  const gig = await post('/create-gig', {
    customerName: 'Asha Customer', customerContact: '+918888888888',
    customerEmail: 'asha@example.com', serviceType: 'plumber', location: 'Rajkot',
    description: 'Leaking kitchen tap', preferredTime: 'Tomorrow 10am',
  });
  assert(gig.jobStatus === 'OPEN', 'job OPEN ' + gig.jobId);
  assert(gig.eligibleCount >= 2, `>=2 eligible workers notified (got ${gig.eligibleCount})`);
  assert(gig.notifiedWorkers.includes(nw.workerId), 'newly-signed worker was in the shortlist');

  console.log('4. two workers express interest');
  await post('/worker-accept', { jobId: gig.jobId, workerId: 'W-1001' });
  await post('/worker-accept', { jobId: gig.jobId, workerId: nw.workerId });
  const interested = await post('/gig-interested-workers', { jobId: gig.jobId });
  assert(interested.workers.length === 2, 'two interested workers listed');

  console.log('5. customer hires W-1001');
  const hire = await post('/customer-hire', { jobId: gig.jobId, chosenWorkerId: 'W-1001' });
  assert(hire.status === 'assigned', 'job assigned to ' + hire.workerName);

  const detail = await get(`/jobs/${gig.jobId}`);
  assert(detail.job.jobStatus === 'ASSIGNED', 'job status ASSIGNED');
  assert(detail.interests.find((i) => i.workerId === 'W-1001').status === 'HIRED', 'W-1001 HIRED');
  assert(detail.interests.find((i) => i.workerId === nw.workerId).status === 'RELEASED', 'other applicant RELEASED');

  console.log('6. cooldown blocks W-1001 from a second job');
  const gig2 = await post('/create-gig', {
    customerName: 'Bob Customer', customerContact: '+917777777777',
    serviceType: 'Plumbing', location: 'Rajkot',
  });
  assert(!gig2.notifiedWorkers.includes('W-1001'), 'W-1001 excluded (on cooldown / busy)');
  assert(gig2.skippedWorkers.some((s) => s.workerId === 'W-1001'), 'W-1001 shows in skippedWorkers with a reason');

  console.log('7. complete + pay + rate');
  await post('/job-complete', { jobId: gig.jobId });
  await post('/payment-complete', { jobId: gig.jobId, amount: 450, method: 'UPI' });
  const rate = await post('/rating-submit', { jobId: gig.jobId, rating: 5, feedback: 'Great work' });
  assert(rate.status === 'rating_recorded', 'rating recorded, new avg ' + rate.newRating);

  const stats = await get('/stats');
  assert(stats.revenue === 450, 'revenue tallies (₹450)');

  console.log('\nALL CHECKS PASSED ✅');
};

run().catch((e) => {
  console.error('\n❌', e.message);
  process.exit(1);
});
