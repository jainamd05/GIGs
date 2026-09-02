// ---------------------------------------------------------------------------
// Client-side helpers for the reference-mockup UI patterns.
// The backend has no pricing / match-score endpoints, so these are computed
// here from real worker + job data. They are deterministic and clearly
// labelled in the UI as an "AI Fair Wage" estimate.
// ---------------------------------------------------------------------------

export const SERVICE_TYPES = ['Plumbing', 'Electrician', 'Cleaning', 'Carpentry'];

export const SERVICE_META = {
  Plumbing:    { base: 300, icon: 'plumb',  tint: 'bg-sky-100 text-sky-600' },
  Electrician: { base: 350, icon: 'bolt',   tint: 'bg-amber-100 text-amber-600' },
  Cleaning:    { base: 250, icon: 'spark',  tint: 'bg-emerald-100 text-emerald-600' },
  Carpentry:   { base: 400, icon: 'saw',    tint: 'bg-orange-100 text-orange-600' },
};

export const baseRate = (service) => SERVICE_META[service]?.base ?? 300;

/**
 * "AI Fair Wage" breakdown — mirrors the reference "Booking & Price
 * Transparency" screen. All figures derive from the service base rate and the
 * assigned worker's rating.
 */
export function fairWage(service, worker = {}, { sameCity = true } = {}) {
  const base = baseRate(service);
  const regional = Math.round(base * 0.15);
  const travel = sameCity ? Math.round(base * 0.012) + 1 : Math.round(base * 0.06);
  const rating = Number(worker.rating) || 4.5;
  const skillBonus = rating >= 4.8 ? 75 : rating >= 4.5 ? 50 : rating >= 4.0 ? 25 : 0;
  const total = base + regional + travel + skillBonus;
  return {
    lines: [
      { label: 'Base Skill Rate', value: base, add: false },
      { label: 'Regional Demand Factor', value: regional, add: true },
      { label: 'Travel Allowance', value: travel, add: true },
      { label: 'Craftsman Skill Bonus', value: skillBonus, add: true },
    ],
    total,
    pools: [
      { label: 'Worker Pension & Insurance Pool (7%)', value: Math.round(total * 0.07) },
      { label: 'Platform Maintenance & Ops (5%)', value: Math.round(total * 0.05) },
    ],
  };
}

/**
 * Match score (0-99) for a worker against a job — distance is unknown so we use
 * skill/location/rating/experience/membership, matching the reference
 * "AI Smart Worker Matching" ordering.
 */
export function matchScore(worker = {}, job = {}) {
  let s = 42;
  const loc = worker.location && job.location &&
    worker.location.toLowerCase() === job.location.toLowerCase();
  if (loc) s += 24;
  const skillOk = !job.serviceType || worker.skill === job.serviceType;
  if (skillOk) s += 6;
  s += ((Number(worker.rating) || 4.5) / 5) * 18;
  s += Math.min(Number(worker.recentJobs) || 0, 12) / 12 * 6;
  s += ((Number(worker.membershipScore) || 50) / 100) * 3;
  return Math.max(20, Math.min(99, Math.round(s)));
}

/** Fake-but-stable "COOP-CITY-NNNN" credential id from the worker id. */
export function coopId(worker = {}) {
  const city = (worker.location || 'IND').slice(0, 4).toUpperCase();
  let h = 0;
  const src = String(worker.workerId || worker.name || '');
  for (let i = 0; i < src.length; i++) h = (h * 31 + src.charCodeAt(i)) & 0xffff;
  return `COOP-${city}-${(1000 + (h % 9000))}`;
}

/** Pseudo years-of-experience derived from jobs completed + rating. */
export function yearsExp(worker = {}) {
  return Math.max(1, Math.round((Number(worker.recentJobs) || 0) / 3 + (Number(worker.rating) || 4) - 3));
}

// Job lifecycle mapped onto the reference 4-stage tracker.
export const STAGES = ['Requested', 'Matched', 'Assigned', 'Completed'];
export function stageIndex(job, interestsCount = 0) {
  if (job.jobStatus === 'COMPLETED') return 3;
  if (job.jobStatus === 'ASSIGNED') return 2;
  if (interestsCount > 0) return 1;
  return 0;
}

export function timeAgo(ts) {
  const d = (Date.now() - new Date(ts).getTime()) / 1000;
  if (d < 45) return 'just now';
  if (d < 90) return '1m ago';
  if (d < 3600) return `${Math.round(d / 60)}m ago`;
  if (d < 5400) return '1h ago';
  if (d < 86400) return `${Math.round(d / 3600)}h ago`;
  return `${Math.round(d / 86400)}d ago`;
}
