const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

async function req(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

export const api = {
  base: BASE,
  health: () => req('/health'),
  serviceTypes: () => req('/service-types'),

  // workflow endpoints (mirror the original n8n webhooks)
  createGig: (payload) => req('/create-gig', { method: 'POST', body: payload }),
  workerAccept: (payload) => req('/worker-accept', { method: 'POST', body: payload }),
  interestedWorkers: (jobId) => req('/gig-interested-workers', { method: 'POST', body: { jobId } }),
  customerHire: (jobId, chosenWorkerId) => req('/customer-hire', { method: 'POST', body: { jobId, chosenWorkerId } }),
  newWorker: (payload) => req('/new_worker', { method: 'POST', body: payload }),
  jobComplete: (jobId) => req('/job-complete', { method: 'POST', body: { jobId } }),
  paymentComplete: (jobId, amount, method) => req('/payment-complete', { method: 'POST', body: { jobId, amount, method } }),
  ratingSubmit: (jobId, workerId, rating, feedback) =>
    req('/rating-submit', { method: 'POST', body: { jobId, workerId, rating, feedback } }),

  // reads
  jobs: (q = '') => req(`/jobs${q}`),
  job: (id) => req(`/jobs/${id}`),
  workers: (q = '') => req(`/workers${q}`),
  workerJobs: (id) => req(`/workers/${id}/jobs`),
  activity: () => req('/activity'),
  stats: () => req('/stats'),
};
