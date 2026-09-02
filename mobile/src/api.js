const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';

const TOKEN_KEY = 'sahayak.token';
export const getToken = () => {
  try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; }
};
export const setToken = (t) => {
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
};
export const clearToken = () => setToken('');

async function req(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {};
  if (body) headers['content-type'] = 'application/json';
  const token = auth ? getToken() : '';
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: Object.keys(headers).length ? headers : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new CustomEvent('sahayak:logout'));
  }
  if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
  return data;
}

export const api = {
  base: BASE,
  health: () => req('/health'),
  serviceTypes: () => req('/service-types'),

  // ---- auth (OTP login / signup) ----
  requestOtp: (payload) => req('/auth/request-otp', { method: 'POST', body: payload, auth: false }),
  verifyOtp: (identifier, code) => req('/auth/verify-otp', { method: 'POST', body: { identifier, code }, auth: false }),
  authMe: () => req('/auth/me'),
  updateMe: (patch) => req('/auth/me', { method: 'PATCH', body: patch }),

  // ---- customer-scoped ----
  myJobs: () => req('/me/jobs'),
  myInterestedWorkers: () => req('/me/interested-workers'),

  // ---- workflow endpoints (mirror the original n8n webhooks) ----
  createGig: (payload) => req('/create-gig', { method: 'POST', body: payload }),
  workerAccept: (payload) => req('/worker-accept', { method: 'POST', body: payload }),
  interestedWorkers: (jobId) => req('/gig-interested-workers', { method: 'POST', body: { jobId } }),
  customerHire: (jobId, chosenWorkerId) => req('/customer-hire', { method: 'POST', body: { jobId, chosenWorkerId } }),
  newWorker: (payload) => req('/new_worker', { method: 'POST', body: payload }),
  jobComplete: (jobId) => req('/job-complete', { method: 'POST', body: { jobId } }),
  paymentComplete: (jobId, amount, method) => req('/payment-complete', { method: 'POST', body: { jobId, amount, method } }),
  ratingSubmit: (jobId, workerId, rating, feedback) =>
    req('/rating-submit', { method: 'POST', body: { jobId, workerId, rating, feedback } }),

  // ---- reads ----
  jobs: (q = '') => req(`/jobs${q}`),
  job: (id) => req(`/jobs/${id}`),
  workers: (q = '') => req(`/workers${q}`),
  workerJobs: (id) => req(`/workers/${id}/jobs`),
  activity: () => req('/activity'),
  stats: () => req('/stats'),
};
