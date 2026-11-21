# SETUP.md — Local Development Setup

This guide explains how to set up CertiFlow for local development **without Docker**.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20.x | https://nodejs.org |
| npm | 10.x | Bundled with Node |
| PostgreSQL | 15 or 16 | https://www.postgresql.org/download/ |
| Redis | 7.x | https://redis.io/docs/getting-started/ |

---

## Step 1: Create the PostgreSQL Database

Open `psql` or pgAdmin and run:

```sql
CREATE USER certiflow WITH PASSWORD 'certiflow123';
CREATE DATABASE certiflow OWNER certiflow;
GRANT ALL PRIVILEGES ON DATABASE certiflow TO certiflow;
```

---

## Step 2: Start Redis

```bash
# macOS (Homebrew)
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis-server

# Windows
# Download from https://github.com/microsoftarchive/redis/releases
# or use WSL2
redis-server
```

---

## Step 3: Backend Setup

```bash
cd certiflow-platform/backend

# Install dependencies
npm install

# Copy environment file
copy .env.example .env     # Windows
cp .env.example .env       # macOS/Linux

# Edit .env if your DB/Redis URLs differ from defaults

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Seed demo data
npm run db:seed

# Start development server
npm run dev
```

The backend will start at **http://localhost:3001**

Verify: `curl http://localhost:3001/health`

---

## Step 4: Frontend Setup

Open a new terminal:

```bash
cd certiflow-platform/frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

The frontend will start at **http://localhost:5173**

---

## Step 5: Verify Everything Works

1. Open http://localhost:5173
2. Log in as **Anika** (Training Centre): `anika@certiflow.gov.in` / `Demo@1234`
3. Navigate to "New Batch" and upload `sample_students.csv` from the project root
4. Use the demo user switcher in the top-right to switch to **Dev** (District Officer)

---

## Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3001` | Backend server port |
| `DATABASE_URL` | `postgresql://...` | Prisma connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `JWT_SECRET` | *(set a strong secret)* | JWT signing secret |
| `JWT_EXPIRES_IN` | `24h` | Token expiry |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin |
| `UPLOAD_DIR` | `./uploads` | Directory for uploaded files |
| `CERTIFICATE_BASE_URL` | `http://localhost:3001` | Base URL for certificate files |
| `PUBLIC_VERIFY_URL` | `http://localhost:5173/verify` | Public verification URL in QR codes |
| `OVERDUE_THRESHOLD_HOURS` | `24` | Hours before batch is overdue |
| `QUALITY_REVIEW_THRESHOLD` | `50` | Minimum candidates to trigger quality review |
| `WHATSAPP_SUCCESS_RATE` | `0.7` | Mock WhatsApp success rate (0–1) |
| `WHATSAPP_MAX_RETRIES` | `5` | Max retry attempts for failed deliveries |

---

## Running Tests

Requires running PostgreSQL and Redis:

```bash
cd backend
npm test
```

For watch mode:
```bash
npm run test:watch
```

---

## Prisma Commands Reference

```bash
# Apply migrations to development DB
npx prisma migrate dev

# Reset DB and re-run all migrations
npx prisma migrate reset

# Open Prisma Studio (visual DB browser)
npx prisma studio

# Generate Prisma client after schema changes
npx prisma generate

# Seed demo data
npm run db:seed
```

---

## Troubleshooting

### "Cannot connect to database"
- Ensure PostgreSQL is running: `pg_isready -h localhost -p 5432`
- Check your `DATABASE_URL` in `.env`
- Ensure the user/database exists (Step 1)

### "Redis connection refused"
- Ensure Redis is running: `redis-cli ping` (should return `PONG`)
- Check your `REDIS_URL` in `.env`

### "Prisma migration failed"
- Try `npx prisma migrate reset` to reset and re-apply
- Ensure the DB user has `CREATE TABLE` permissions

### TypeScript build errors
```bash
# Check for type errors without building
npx tsc --noEmit
```

### Port already in use
- Backend: Change `PORT` in `.env`
- Frontend: Vite will auto-select the next available port
