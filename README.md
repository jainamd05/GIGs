# Sahayak — working model

A complete, self-contained implementation of the **Sahayak** cooperative
gig-worker matching platform described in `../CoopServe_Project_Context.md`
(originally drafted under the name "CoopServe").

The original project split its logic across an **n8n cloud instance** + **Google
Sheets**, with a partly-wired React repo. This model replaces all of that with:

| Original                                   | Here                                             |
| ------------------------------------------ | ------------------------------------------------ |
| n8n workflow `AhAf1jXy5a72lFul`            | `backend/` — Express service, same webhook paths |
| Google Sheets (Jobs / Workers / Interests) | `backend/` — SQLite (`node:sqlite`), same columns |
| n8n email / WhatsApp nodes                 | `backend/src/notify.js` — SMTP + Twilio, simulated when unconfigured |
| `MobileApp_Prototype_SIH26` React app      | `frontend/` — desktop web app · `mobile/` — mobile-responsive app, both React + Vite + Tailwind, 3 roles |

Everything runs **offline** with zero credentials. Add real SMTP / Twilio keys
later to make notifications actually send.

---

## Quick start

```bash
# 1. backend  (terminal 1)
cd backend
cp .env.example .env          # optional — works without it
npm install
npm start                     # http://localhost:4000

# 2. frontend — desktop web app (terminal 2)
cd frontend
cp .env.example .env          # optional
npm install
npm run dev                   # http://localhost:5173

# 3. mobile — mobile app with login (terminal 3, optional)
cd mobile
cp .env.example .env          # optional
npm install
npm run dev                   # http://localhost:5174
```

Open http://localhost:5173 (desktop) or http://localhost:5174 (mobile). The backend
seeds 10 demo workers on first run (`backend/seed/workers.json`).

The **mobile app requires a login** — see *Accounts & roles* below. The desktop
app (`frontend/`) is unchanged and still has open Customer / Worker / Admin tabs.

### Accounts & roles (mobile app)

Login and signup are **passwordless — a 6-digit OTP** sent to an email or phone.
Every notification is simulated unless SMTP / Twilio is configured, so the code is
also shown on-screen and printed to the backend console (`EXPOSE_OTP=true`).

| Role | After login they see |
| --- | --- |
| **Customer** | *New Gig* (create a request) · *Interested* (workers who responded — hire one) · *Account* |
| **Worker** | *Jobs* (open jobs matched to them) · *My Work* (their assignments + payouts) · *Profile* |
| **Admin** | the operations dashboard only |

- **Sign up** picks the role. A **worker** signup also creates the linked
  cooperative-worker profile (`skill` required). An **admin** signup needs the
  invite code (`ADMIN_INVITE_CODE`, default `SAHAYAK-ADMIN`).
- A seeded admin always exists: **`admin@sahayak.local`** (log in, read the OTP
  from the console).

### 48-hour gig expiry

An OPEN gig with no worker hired within **48 hours** is auto-cancelled
(`jobStatus = CANCELLED`, reason recorded) and its interested workers are
released. It stays visible in the customer's history. A background sweep runs
every 10 min (`EXPIRY_SWEEP_MS`). To watch it happen in seconds, set
`GIG_EXPIRY_HOURS=0.01` and `EXPIRY_SWEEP_MS=5000` in `backend/.env`.

> Both frontends share the same backend. `backend/.env.example` allows both origins
> (`CORS_ORIGINS=http://localhost:5173,http://localhost:5174`).

### The two frontends

| | `frontend/` | `mobile/` |
| --- | --- | --- |
| Layout | responsive desktop web, multi-column | phone-width column in a device frame, bottom tab bar |
| Port | 5173 | 5174 |
| Auth | none — open tabs | **OTP login required**, then role-scoped |
| Roles | Customer / Worker / Admin tabs | one role per account — see *Accounts & roles* |
| Design | shared visual system — royal-blue + gradient headers, fair-wage price breakdown, worker "match %" cards, job status stepper (all derived client-side in `src/lib.js`) | same system, tuned for touch: service-category grid, request sheet, "AI worker matching" cards, live-dispatch tracking |

### Prove the whole lifecycle from the CLI

```bash
cd backend && npm start        # in one terminal
cd backend && npm run smoke     # in another — signup -> gig -> interest -> hire -> cooldown -> complete/pay/rate
```

---

## Workflow logic (mirrors §5 of the context doc)

**`POST /create-gig`** — validate → insert job (`OPEN`) →
`Find Workers By Skill` → `Filter Eligible` (available + location match +
active member) → `Filter Out Cooldown` → notify eligible workers + customer.
Response also returns `skippedWorkers` with a reason each, for the admin view.

**`POST /worker-accept`** — append to `interests` (`INTERESTED`), notify
customer. *Unlike the original n8n flow this does **not** mark the worker
`Busy`* — that was flagged as a bug (gap #9); availability only changes on hire.

**`POST /gig-interested-workers`** — `{ jobId }` → `{ workers: [...] }`.

**`POST /customer-hire`** — `{ jobId, chosenWorkerId }` → in one transaction:
chosen interest → `HIRED`, others → `RELEASED`, job → `ASSIGNED`, chosen worker
→ `Busy` + `cooldownUntil = now + COOLDOWN_HOURS` (default 12). Notifies the
hired worker, the customer, and the released workers.

**`POST /new_worker`** — the sign-up piece that was unfinished in n8n (§6),
here complete: validated, returns a real confirmation, appends to the worker
table, welcomes the worker over every channel.

**Lifecycle endpoints the original n8n workflow never had (gap #7):**
`POST /job-complete`, `POST /payment-complete`, `POST /rating-submit`
(rating keeps a running average on the worker).

All POST routes are mounted at both `/` and `/webhook/` so the paths match the
original n8n webhook URLs (`.../webhook/create-gig`).

### Auth endpoints (mobile app)

`POST /auth/request-otp` `{ identifier, mode, role?, name?, location?, skill?, inviteCode? }`
→ issues a 6-digit OTP (returned in the response when `EXPOSE_OTP=true`).
`POST /auth/verify-otp` `{ identifier, code }` → `{ token, user, worker? }`.
`GET /auth/me`, `PATCH /auth/me` (name / location). Tokens are HMAC-signed
(`AUTH_SECRET`) — no external auth dependency.

Requests carry the token as `Authorization: Bearer <token>`. Scoping only kicks
in when a token is present, so the token-less n8n paths and `npm run smoke` are
unaffected.

### Read endpoints (used by the frontend)

`GET /jobs`, `/jobs/:id`, `/workers`, `/workers/:id/jobs`, `/activity`,
`/stats`, `/health`, `/service-types`.
`GET /me/jobs`, `/me/interested-workers` — customer-token-scoped (own gigs only).

---

## Notifications — credentials to add when you're ready

Everything below is **optional**. Without it, each notification is logged to the
console and the in-app **activity feed**, tagged `sim`. Fill these into
`backend/.env`:

### Email (SMTP, via nodemailer)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=you@gmail.com
SMTP_PASS=<16-char Gmail app password>      # not your normal password
SMTP_FROM="Sahayak <you@gmail.com>"
```

### SMS + WhatsApp (Twilio)

```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_SMS_FROM=+1XXXXXXXXXX                 # an SMS-capable Twilio number
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886   # Twilio WhatsApp sender / sandbox
```

> For the Twilio **WhatsApp sandbox**, each recipient phone must first join the
> sandbox by texting the join code to that number. Worker/customer phone numbers
> in the seed data are placeholders — change them to real numbers to test.

**Tell me once you've added the values** and I'll help verify a real send.

### Demo tip — see the cooldown work in seconds

Set `COOLDOWN_HOURS=0.02` in `backend/.env` (~1 minute) instead of 12.

---

## Project layout

```
sahayak/
├── backend/
│   ├── src/
│   │   ├── index.js        Express app, route mounting, request logging
│   │   ├── config.js       .env loading
│   │   ├── db.js           node:sqlite schema (Jobs/Workers/Interests + extras) + seed + tx()
│   │   ├── matching.js     skill/location/membership/cooldown eligibility
│   │   ├── notify.js       SMTP + Twilio with simulate-on-missing-creds fallback
│   │   ├── activity.js     activity-feed writer
│   │   ├── auth.js         HMAC session tokens + OTP issue/consume + middleware
│   │   ├── users.js        user + linked-worker creation, identifier normalization
│   │   ├── sweeper.js      48h no-response gig auto-cancel (runs on an interval)
│   │   └── routes/
│   │       ├── api.js      workflow + read endpoints (role-scoped when a token is sent)
│   │       └── auth.js     /auth/request-otp, /auth/verify-otp, /auth/me
│   ├── seed/workers.json   10 demo cooperative workers
│   └── scripts/
│       ├── seed.js         wipe + re-seed (workers + admin account)
│       └── smoke.js        end-to-end lifecycle assertions
├── frontend/            desktop web app (port 5173)
│   └── src/
│       ├── api.js          typed wrapper over the backend
│       ├── lib.js          client-side fair-wage math, match score, stage mapping
│       ├── App.jsx         tab shell + 4s auto-refresh + backend-health badge
│       └── components/
│           ├── CustomerView.jsx   request form, AI-match cards, hire, fair-wage pay, rate
│           ├── WorkerView.jsx     sign-up, "act as" existing worker, open jobs, express interest
│           ├── AdminView.jsx      stat tiles, jobs + workers tables, live activity feed
│           ├── icons.jsx          inline SVG icon set
│           └── ui.jsx             shared components (stepper, fair-wage card, match card, …)
└── mobile/              mobile app with OTP login (port 5174)
    └── src/
        ├── api.js          typed backend wrapper + bearer-token handling
        ├── auth.jsx         AuthProvider / useAuth — token + current account
        ├── lib.js / icons.jsx
        ├── App.jsx          auth gate → role-scoped shell (per-role bottom nav)
        ├── ui.jsx           mobile-tuned shared components + full-screen Sheet
        └── screens/
            ├── Auth.jsx            login / signup + OTP entry
            ├── RequestSheet.jsx    create-gig form ("Run AI worker matching")
            ├── BookingDetail.jsx   match cards → dispatch tracking, OTP, fair-wage, pay, rate
            ├── customer/  NewGig.jsx · Interested.jsx · Account.jsx
            └── worker/    Jobs.jsx · MyWork.jsx · Profile.jsx        (+ Admin.jsx)
```
