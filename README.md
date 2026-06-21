# Classerize Backend

Node.js/Express API for the Classerize multi-LMS aggregation platform.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Framework | Express 4 |
| Database | MySQL 8.0+ |
| Auth | JWT (httpOnly cookies) + Google OAuth2 (Passport.js) |
| Queue | BullMQ + Redis |
| AI | OpenAI GPT-4o-mini (switchable to Gemini) |
| Email | SendGrid |
| Docs | Swagger UI at `/api/docs` |

---

## Quick Start

```bash
cp .env.example .env
# Fill in all required values in .env

# Create DB and run schema
mysql -u root -p classerize < schema.sql

# (Existing DB) Run migration instead
mysql -u root -p classerize < migrations/001_phase1_foundation.sql

npm install
npm run dev
```

---

## Environment Variables

See `.env.example` for full list. Required at startup:

```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
JWT_SECRET                # min 32 chars
ENCRYPTION_KEY            # 64 hex chars (32-byte AES-256 key)
FRONTEND_URL              # e.g. http://localhost:3001
```

Optional but needed for features:

```
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET   # Google SSO + Classroom
OPENAI_API_KEY                            # AI summaries (or GEMINI_API_KEY)
SENDGRID_API_KEY / EMAIL_FROM             # Email notifications
REDIS_URL                                 # BullMQ; falls back to inline sync if absent
```

---

## API Surface

All routes are prefixed `/api/`. Full docs at `GET /api/docs`.

| Prefix | Description |
|--------|-------------|
| `/auth` | Login, logout, current user, Google OAuth |
| `/users` | Register, profile |
| `/linked-accounts` | Link/unlink LMS accounts |
| `/lms` | Trigger sync for one or all accounts |
| `/assignments` | List, filter, update status |
| `/grades` | Grade list and course-level summary |
| `/calendar` | Events, manual CRUD, iCal export |
| `/notifications` | List, mark read, preferences |
| `/ai` | Study schedule, urgency assessment |
| `/health` | Status check |

---

## Workers (BullMQ)

Run each in a separate process alongside the API:

```bash
node workers/lmsSyncWorker.js           # LMS data sync
node workers/aiSummaryWorker.js         # AI assignment summaries
node workers/googleCalendarSyncWorker.js # Push due dates to Google Calendar
node workers/notificationDispatchWorker.js # Deadline alerts + daily digest
```

Requires Redis. Set `REDIS_URL` in `.env`.

---

## Tests

```bash
npm test          # run all Jest unit tests
npm run test:watch
```

Test files in `__tests__/`. No DB or network connections required — all external dependencies are mocked.

---

## LMS Support

| LMS | Auth Method | Notes |
|-----|------------|-------|
| Canvas | User API token | Link via `/api/linked-accounts` |
| Blackboard | Bearer token | Institution REST API token |
| Google Classroom | OAuth2 | Auto-linked on Google SSO |
| Moodle | Web service token | Profile → Security Keys in Moodle |

---

## Project Structure

```
├── app.js                  # Express app, routes, middleware
├── bin/www.js              # HTTP server entry point
├── config/passport.js      # Google OAuth2 strategy
├── controllers/            # Route handlers
├── middleware/             # authMiddleware, errorHandler
├── migrations/             # Safe additive DB migrations
├── models/                 # userModel (DB queries)
├── routes/                 # Express routers
├── schema.sql              # Full target schema
├── services/               # LMS integrations, AI, email, sync
├── utils/cryptoUtils.js    # AES-256-CBC encrypt/decrypt
├── workers/                # BullMQ background workers
└── __tests__/              # Jest unit tests
```
