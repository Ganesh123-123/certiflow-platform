# CertiFlow – Skilling Certificate Issuance Platform

> **Pragati Skills Mission** · Production-quality hackathon project

A complete digital certificate issuance and verification platform built for the fictional government initiative "Pragati Skills Mission". Manage training centres, student batches, district-level approvals, quality checks, state-level approvals, digital certificate generation, WhatsApp delivery, and public certificate verification — all in one platform.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CERTIFLOW PLATFORM                       │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React + Vite + TypeScript + Tailwind)               │
│  Port 5173 (dev) / 80 (Docker)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Node.js + Express + TypeScript)        Port 3001      │
│  ├── REST API (JWT Auth + RBAC)                                 │
│  ├── Socket.IO (real-time dashboard updates)                    │
│  ├── BullMQ Workers (certificate gen + WhatsApp)               │
│  └── node-cron (overdue batch monitoring)                       │
├──────────────────────────┬──────────────────────────────────────┤
│  PostgreSQL (Prisma ORM) │  Redis (BullMQ queues + sessions)   │
│  Port 5432               │  Port 6379                           │
└──────────────────────────┴──────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Clone and navigate
git clone <repo-url>
cd certiflow-platform

# 2. Start everything with Docker Compose
docker compose up --build

# 3. Seed the database (first time only)
docker compose exec backend npx ts-node prisma/seed.ts

# 4. Open the app
#    Frontend:  http://localhost:5173
#    Backend:   http://localhost:3001
#    API Docs:  http://localhost:3001/health
```

For local development without Docker, see [SETUP.md](./SETUP.md).

---

## 👤 Demo Accounts

| Name | Role | Email | Password | District |
|------|------|-------|----------|----------|
| Anika | Training Centre | anika@certiflow.gov.in | Demo@1234 | Pune |
| Dev | District Officer | dev@certiflow.gov.in | Demo@1234 | Pune |
| Meera | District Officer | meera@certiflow.gov.in | Demo@1234 | Pune |
| Kabir | District Officer | kabir@certiflow.gov.in | Demo@1234 | Mumbai |
| Neha | Quality Team | neha@certiflow.gov.in | Demo@1234 | — |
| Farah | State Officer | farah@certiflow.gov.in | Demo@1234 | — |

> **Demo Switcher**: In development mode, use the top-right user switcher to quickly change accounts without re-logging in. This only works client-side in dev mode — no backend privilege escalation occurs.

---

## 🔄 Approval Workflow

```
Training Centre
    │  Submits Batch
    ▼
DISTRICT_REVIEW ──► Requires 2 distinct district officers to approve
    │  Both approve (or 1 rejects → REJECTED / 1 sends back → RETURNED)
    ▼
QUALITY_REVIEW ──► Only if batch has > 50 candidates (configurable)
    │  Quality team approves
    ▼
STATE_REVIEW ──► Final approval by State Officer
    │  Approved
    ▼
APPROVED ──► Background workers generate PDF certificates + WhatsApp delivery
```

---

## 📦 Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 18 + Vite | UI framework + build tool |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| React Hook Form + Zod | Form validation |
| Lucide React | Icon library |
| Socket.IO Client | Real-time updates |
| React Hot Toast | Toast notifications |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js 20 + Express | Server runtime + framework |
| TypeScript | Type safety |
| Prisma ORM | Database access layer |
| PostgreSQL 16 | Primary database |
| Redis 7 | Queue storage |
| BullMQ | Job queues (cert gen, WhatsApp) |
| Socket.IO | Real-time event push |
| JWT (jsonwebtoken) | Authentication |
| bcryptjs | Password hashing |
| PDFKit | PDF certificate generation |
| qrcode | QR code generation |
| multer | CSV/XLSX file upload |
| papaparse | CSV parsing |
| xlsx | Excel file parsing |
| node-cron | Scheduled overdue monitoring |
| Winston | Structured logging |
| Zod | Request validation |
| Helmet | HTTP security headers |
| express-rate-limit | Rate limiting |

---

## 🔒 Security Design

| Concern | Approach |
|---------|----------|
| Authentication | JWT tokens (24h expiry), stored in memory (not localStorage) |
| Passwords | bcrypt with 10 rounds |
| Authorization | Role-Based Access Control middleware on every protected route |
| Rate Limiting | 100 req / 15 min per IP on all `/api` routes |
| CORS | Restricted to `FRONTEND_URL` only |
| Security Headers | Helmet.js (CSP, HSTS, XSS protection) |
| Input Validation | Zod schemas on all request bodies |
| SQL Injection | Prisma ORM parameterised queries (no raw SQL) |
| Concurrency | Serializable DB transactions + unique constraints for approvals |

---

## 🏭 Event-Driven Architecture

Workers run in-process with the backend server (same Node.js process, separate async loops). They are production-ready and can be extracted to separate containers by running `npm run worker`.

### Events
| Event | Trigger | Handler |
|-------|---------|---------|
| `BATCH_SUBMITTED` | Training centre submits | Audit log |
| `DISTRICT_APPROVED` | District officer approves | Check 2-officer rule |
| `QUALITY_APPROVED` | Quality team approves | Move to STATE_REVIEW |
| `STATE_APPROVED` | State officer approves | Queue certificate jobs |
| `CERTIFICATE_GENERATED` | Worker completes PDF | Queue WhatsApp job |
| `WHATSAPP_DELIVERED` | Mock provider success | Mark delivered |
| `WHATSAPP_DELIVERY_FAILED` | All retries exhausted | Alert |
| `CERTIFICATE_REVOKED` | State officer cancels | Update verify status |

### Queue Configuration
- **Certificate Queue**: `cert-gen`, jobId = `cert-{candidateId}` (idempotent)
- **WhatsApp Queue**: `whatsapp-delivery`, jobId = `wa-{certificateId}` (idempotent)
- **Retry**: 5 attempts with exponential backoff (2s base, 2× multiplier)
- **Deduplication**: Idempotent jobIds prevent duplicate jobs after crashes

---

## 🗄️ Database Schema Highlights

### Key Uniqueness Constraints
```sql
-- Prevents double-voting by the same officer
UNIQUE (batch_id, officer_id) ON approvals

-- One certificate per candidate (never duplicated)
UNIQUE (candidate_id) ON certificates

-- No duplicate candidates in a batch
UNIQUE (batch_id, email) ON candidates
UNIQUE (batch_id, mobile) ON candidates
```

### Concurrency Protection
District officer approvals use `isolationLevel: 'Serializable'` on Prisma `$transaction`. If two officers attempt to approve the same batch simultaneously:
1. The DB serialises the transactions
2. Each officer creates exactly one approval record (enforced by unique constraint)
3. The batch advances to the next stage only once
4. Any race condition is handled gracefully (HTTP 409 returned to the later request)

---

## 📋 Business Rules

| Rule | Implementation |
|------|---------------|
| 2 district officers required | Approval count check in `approval.service.ts` |
| Quality review for >50 candidates | `QUALITY_REVIEW_THRESHOLD` env var (default: 50) |
| District officers see only their district's batches | `districtId` filter in queries |
| No duplicate certificates | `@@unique([candidateId])` on Certificate model |
| Atomic CSV upload | Prisma transaction: all candidates or none |
| Overdue monitoring | node-cron runs hourly, marks batches pending >24h |
| Revocation is instant | Live DB query on `/verify` page, no caching |

---

## 📁 Project Structure

```
certiflow-platform/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Database schema
│   │   └── seed.ts                # Demo data seeder
│   ├── src/
│   │   ├── config/                # Env, DB, Redis config
│   │   ├── controllers/           # Route handlers (thin layer)
│   │   ├── middleware/            # Auth, RBAC, error handler, rate limiter
│   │   ├── providers/             # WhatsApp mock provider
│   │   ├── queues/                # BullMQ queue definitions
│   │   ├── routes/                # Express route definitions
│   │   ├── services/              # Business logic
│   │   ├── socket/                # Socket.IO server
│   │   ├── types/                 # TypeScript type definitions
│   │   ├── utils/                 # PDF gen, QR, CSV parser, logger
│   │   ├── workers/               # BullMQ workers + overdue monitor
│   │   ├── app.ts                 # Express app setup
│   │   └── server.ts              # HTTP server entry point
│   ├── tests/
│   │   └── batch.test.ts          # Jest + Supertest integration tests
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/            # Reusable UI components
│   │   │   ├── layout/            # AppLayout, Sidebar, TopBar
│   │   │   └── ui/                # Badge, Modal, StatsCard, etc.
│   │   ├── contexts/              # AuthContext (JWT + demo switcher)
│   │   ├── lib/                   # Axios client, Socket.IO client
│   │   ├── pages/
│   │   │   ├── training/          # BatchList, NewBatch (CSV upload wizard)
│   │   │   ├── district/          # DistrictBatches (approval)
│   │   │   ├── quality/           # QualityQueue
│   │   │   ├── state/             # StatePending, StateAllBatches, Overdue, Audit
│   │   │   ├── Dashboard.tsx      # Role-aware dashboard
│   │   │   ├── BatchDetail.tsx    # Detailed batch view
│   │   │   ├── Login.tsx          # Login page
│   │   │   └── Verify.tsx         # Public certificate verification
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Router + protected routes
│   │   └── main.tsx               # App entry point
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
├── sample_students.csv            # 10-row sample for testing uploads
├── README.md
├── SETUP.md
└── DEPLOYMENT.md
```

---

## 🧪 Testing

```bash
cd backend

# Run all tests (requires running PostgreSQL + Redis)
npm test

# Watch mode
npm run test:watch
```

Tests cover:
- Authentication (login, JWT validation, role checks)
- Batch creation and CSV upload (atomic, row-level validation)
- District approval workflow (2-officer rule, concurrency)
- Quality review routing
- State approval and certificate job queuing
- Public certificate verification

---

## 🌐 API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user profile |
| POST | `/api/batches` | TC | Create batch |
| POST | `/api/batches/:id/upload` | TC | Upload student CSV |
| POST | `/api/batches/:id/submit` | TC | Submit for approval |
| GET | `/api/approvals/pending` | DO | Pending batches |
| POST | `/api/approvals/:id/approve` | DO | Approve batch |
| POST | `/api/approvals/:id/reject` | DO | Reject batch |
| POST | `/api/approvals/:id/return` | DO | Return for correction |
| GET | `/api/quality/queue` | QT | Quality review queue |
| POST | `/api/quality/:id/approve` | QT | Quality approve |
| POST | `/api/quality/:id/reject` | QT | Quality reject |
| GET | `/api/state/pending` | SO | Final approval queue |
| POST | `/api/state/:id/approve` | SO | Final approval |
| POST | `/api/state/:id/reject` | SO | Reject batch |
| POST | `/api/state/certificates/:id/revoke` | SO | Revoke certificate |
| GET | `/api/certificates/verify/:certNumber` | No | Public verification |
| GET | `/api/certificates/:id/download` | Yes | Download PDF |
| GET | `/api/audit/logs` | SO | Audit log |
| GET | `/api/dashboard/stats` | Yes | Dashboard statistics |
| GET | `/api/districts` | No | District list |

**Role codes**: TC = Training Centre, DO = District Officer, QT = Quality Team, SO = State Officer

---

## 🐳 Docker

```bash
# Start all services
docker compose up --build -d

# View logs
docker compose logs -f backend

# Stop everything
docker compose down

# Reset database (WARNING: destroys data)
docker compose down -v
docker compose up --build -d
```

---

## 📄 License

MIT — Built for the Pragati Skills Mission Hackathon.
