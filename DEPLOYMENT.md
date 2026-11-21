# DEPLOYMENT.md — Production Deployment Guide

---

## Option 1: Docker Compose (Recommended for Demos & Staging)

### Prerequisites
- Docker 24+ and Docker Compose v2
- A server or VM with 2 GB RAM minimum

### Steps

```bash
# 1. Clone the repo
git clone <repo-url>
cd certiflow-platform

# 2. Configure production secrets
# Edit docker-compose.yml and change:
#   - JWT_SECRET to a strong random string
#   - POSTGRES_PASSWORD / DATABASE_URL password
# Or use a .env file at the root (docker compose reads it automatically)

# 3. Build and start
docker compose up --build -d

# 4. Seed the database (first time only)
docker compose exec backend npx ts-node prisma/seed.ts

# 5. Verify
curl http://localhost:3001/health
# → { "status": "ok", ... }

# View real-time logs
docker compose logs -f

# Stop
docker compose down
```

---

## Option 2: Manual VPS Deployment

### Prerequisites
- Ubuntu 22.04 LTS (or similar)
- Node.js 20 (via nvm or NodeSource)
- PostgreSQL 16
- Redis 7
- nginx (reverse proxy)
- PM2 (process manager)

### 1. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE USER certiflow WITH PASSWORD 'STRONG_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE certiflow OWNER certiflow;"
```

### 3. Install Redis
```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 4. Build Backend
```bash
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run db:seed
```

### 5. Start Backend with PM2
```bash
npm install -g pm2
pm2 start dist/server.js --name certiflow-backend
pm2 save
pm2 startup
```

### 6. Build Frontend
```bash
cd ../frontend
npm ci
# Set VITE_API_URL for production
VITE_API_URL=https://api.yourdomain.com npm run build
# dist/ folder is ready to serve
```

### 7. Configure nginx

```nginx
# /etc/nginx/sites-available/certiflow
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend (static files)
    root /var/www/certiflow/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    # Certificate file downloads
    location /uploads {
        proxy_pass http://localhost:3001;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/certiflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL with Let's Encrypt
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Environment Variables for Production

Create `/etc/certiflow/backend.env` or set via PM2 ecosystem file:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://certiflow:STRONG_PASSWORD@localhost:5432/certiflow
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate with: openssl rand -hex 64>
JWT_EXPIRES_IN=24h
FRONTEND_URL=https://yourdomain.com
UPLOAD_DIR=/var/www/certiflow/uploads
CERTIFICATE_BASE_URL=https://api.yourdomain.com
PUBLIC_VERIFY_URL=https://yourdomain.com/verify
OVERDUE_THRESHOLD_HOURS=24
QUALITY_REVIEW_THRESHOLD=50
WHATSAPP_SUCCESS_RATE=0.7
WHATSAPP_MAX_RETRIES=5
```

---

## Health Checks

| Endpoint | Expected Response |
|----------|------------------|
| `GET /health` | `{"status":"ok","timestamp":"...","version":"1.0.0"}` |
| `GET /api/districts` | `{"success":true,"data":[...]}` |

---

## Monitoring & Logs

```bash
# PM2 logs
pm2 logs certiflow-backend

# Nginx logs
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log

# Redis logs
tail -f /var/log/redis/redis-server.log
```

---

## Backup Strategy

```bash
# PostgreSQL backup
pg_dump -U certiflow certiflow > backup_$(date +%Y%m%d).sql

# Restore
psql -U certiflow certiflow < backup_20240101.sql
```

---

## Scaling Considerations

| Component | Scaling Strategy |
|-----------|-----------------|
| Backend API | Horizontal scaling behind load balancer (stateless except Socket.IO) |
| Socket.IO | Use Redis adapter (`@socket.io/redis-adapter`) for multi-instance |
| BullMQ Workers | Extract to separate worker containers for independent scaling |
| PostgreSQL | Read replicas for reporting queries |
| Redis | Redis Sentinel or Redis Cluster for HA |
| File Storage | Move to S3-compatible object storage (AWS S3, MinIO) |

---

## Security Checklist for Production

- [ ] Change default passwords in `docker-compose.yml` or env files
- [ ] Generate a strong `JWT_SECRET` (`openssl rand -hex 64`)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Restrict PostgreSQL to localhost or VPC
- [ ] Restrict Redis to localhost or VPC
- [ ] Set `FRONTEND_URL` to your actual production domain (CORS)
- [ ] Enable firewall (ufw): allow only 80, 443, 22
- [ ] Set up automated DB backups
- [ ] Configure log rotation
- [ ] Review rate limiting (`RATE_LIMIT_MAX`)
