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
| `MobileApp_Prototype_SIH26` React app      | `frontend/` — fresh React + Vite + Tailwind, 3 roles |

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

# 2. frontend (terminal 2)
cd frontend
cp .env.example .env          # optional
npm install
npm run dev                   # http://localhost:5173
```

Open http://localhost:5173 and use the **Customer / Worker / Admin** tabs.
The backend seeds 10 demo workers on first run (`backend/seed/workers.json`).

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

### Read endpoints (used by the frontend)

`GET /jobs`, `/jobs/:id`, `/workers`, `/workers/:id/jobs`, `/activity`,
`/stats`, `/health`, `/service-types`.

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
│   │   └── routes/api.js   every endpoint
│   ├── seed/workers.json   10 demo cooperative workers
│   └── scripts/
│       ├── seed.js         wipe + re-seed
│       └── smoke.js        end-to-end lifecycle assertions
└── frontend/
    └── src/
        ├── api.js          typed wrapper over the backend
        ├── App.jsx         tab shell + 4s auto-refresh + backend-health badge
        └── components/
            ├── CustomerView.jsx   request form, interested-worker list, hire, complete/pay/rate
            ├── WorkerView.jsx     sign-up, "act as" existing worker, open jobs, express interest
            ├── AdminView.jsx      stat tiles, jobs + workers tables, live activity feed
            └── ui.jsx             shared bits
```
