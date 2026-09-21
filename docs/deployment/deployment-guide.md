# GrahVarta — Deployment Guide

## Overview

GrahVarta is deployed as a **Docker Compose stack** on a single VPS. All services run as Docker containers behind an Nginx reverse proxy with SSL termination.

```
VPS
└── Docker Compose
    ├── nginx          (port 80/443, reverse proxy + SSL)
    ├── backend        (Node.js API + Socket.io, port 3000 internal)
    ├── admin          (Admin portal, Nginx SPA, port 80 internal)
    ├── astrologer     (Astrologer portal, Nginx SPA, port 80 internal)
    └── db             (PostgreSQL 15, port 5432 internal)
```

---

## Prerequisites

- Ubuntu/Debian VPS with root/sudo access
- Domain names pointing to the VPS IP:
  - `grahvarta.com` → VPS IP
  - `api.grahvarta.com` → VPS IP
- Git repository access

---

## First-Time Deployment

### Option A: Automated (deploy script)

```bash
# SSH into VPS
ssh root@<vps-ip>

# Run the deploy script
bash <(curl -s https://raw.githubusercontent.com/.../deploy.sh)
```

The `deploy/deploy.sh` script automates:
1. Docker + Docker Compose installation
2. Repository clone to `/opt/grahvarta`
3. `.env` file creation (prompts for secrets)
4. Let's Encrypt SSL certificate issuance
5. `docker compose up -d` to start all services
6. Auto-renewal cron setup for SSL

### Option B: Manual

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh
apt install docker-compose-plugin

# 2. Clone repository
git clone <repo-url> /opt/grahvarta
cd /opt/grahvarta

# 3. Configure environment
cp .env.example .env
# Edit .env with your values (see Environment Variables section)

# 4. Issue SSL certificates
certbot certonly --standalone -d grahvarta.com -d api.grahvarta.com

# 5. Start services
docker compose up -d --build

# 6. Run database migrations
docker compose exec backend node scripts/migrate.js
```

---

## Subsequent Deployments (Updates)

```bash
cd /opt/grahvarta
git pull origin main
docker compose up -d --build
```

Docker Compose will rebuild only changed images and perform a rolling restart.

---

## Environment Variables

### Root `.env` (Docker Compose level)

| Variable | Example | Description |
|---|---|---|
| `DOMAIN` | `grahvarta.com` | Primary domain |
| `API_DOMAIN` | `api.grahvarta.com` | API subdomain |
| `DB_PASSWORD` | `strongpassword` | PostgreSQL password |
| `VITE_API_URL` | `https://api.grahvarta.com` | Injected into React portals at build time |

### `backend/.env`

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `production` or `development` |
| `DB_HOST` | `db` (Docker service name) |
| `DB_PORT` | `5432` |
| `DB_NAME` | `grahvarta_db` |
| `DB_USER` | `grahvarta_user` |
| `DB_PASSWORD` | Must match root `.env` |
| `JWT_SECRET` | Minimum 32 characters, random string |
| `JWT_EXPIRES_IN` | `30d` |
| `APP_URL` | `https://api.grahvarta.com` |
| `FRONTEND_URL` | `https://grahvarta.com` |
| `CORS_ORIGIN` | Comma-separated allowed origins |
| `RAZORPAY_KEY_ID` | Razorpay dashboard key |
| `RAZORPAY_KEY_SECRET` | Razorpay secret |
| `RAZORPAY_ACCOUNT_NUMBER` | Payout account |
| `AGORA_APP_ID` | Agora project App ID |
| `AGORA_APP_CERTIFICATE` | Agora project certificate |
| `FIREBASE_SERVICE_ACCOUNT` | Full Firebase service account JSON (as string) |
| `UPLOAD_DIR` | `./uploads` |
| `MAX_FILE_SIZE` | `10485760` (10 MB) |

> **Security**: Never commit `.env` files. The `.gitignore` excludes them. Store secrets in a password manager or secrets manager.

---

## Docker Compose Services

### `db` — PostgreSQL 15

```yaml
image: postgres:15
environment:
  POSTGRES_DB: grahvarta_db
  POSTGRES_USER: grahvarta_user
  POSTGRES_PASSWORD: ${DB_PASSWORD}
volumes:
  - postgres_data:/var/lib/postgresql/data
healthcheck:
  test: pg_isready -U grahvarta_user
  interval: 10s
  retries: 5
```

### `backend` — Node.js API

```yaml
build: ./backend
depends_on:
  db:
    condition: service_healthy
environment:
  DB_HOST: db
  NODE_ENV: production
volumes:
  - ./uploads:/app/uploads
ports:
  - "3000"  # internal only
```

### `admin` — Admin Portal

```yaml
build: ./admin-portal
# Nginx serving SPA at /admin path
```

### `astrologer` — Astrologer Portal

```yaml
build:
  context: ./astrologer-portal
  args:
    VITE_API_URL: ${VITE_API_URL}
# Nginx serving SPA
```

### `nginx` — Reverse Proxy

```yaml
image: nginx:alpine
ports:
  - "80:80"
  - "443:443"
volumes:
  - ./docker/nginx.conf:/etc/nginx/nginx.conf
  - /etc/letsencrypt:/etc/letsencrypt:ro
  - ./uploads:/var/www/uploads:ro
```

---

## Nginx Routing

| Request | Proxied To |
|---|---|
| `api.grahvarta.com/api/*` | `backend:3000` |
| `api.grahvarta.com/socket.io/*` | `backend:3000` (WebSocket upgrade) |
| `api.grahvarta.com/uploads/*` | Static file from `/var/www/uploads` |
| `grahvarta.com/admin/*` | `admin:80` |
| `grahvarta.com/*` | `astrologer:80` |
| `http://*` → `https://*` | 301 redirect |

---

## Database Migrations

Migrations are SQL files in `backend/migrations/` numbered sequentially (001–023).

```bash
# Run all migrations (first deploy)
docker compose exec backend node scripts/migrate.js

# Or manually apply a single migration
docker compose exec db psql -U grahvarta_user -d grahvarta_db -f /migrations/024_new_feature.sql
```

> Migrations are **not** run automatically on container start. Apply them manually after each deploy that includes schema changes.

---

## SSL Certificate Management

```bash
# Initial issuance (done by deploy.sh)
certbot certonly --standalone -d grahvarta.com -d api.grahvarta.com

# Manual renewal
certbot renew

# Auto-renewal (set by deploy.sh in crontab)
0 12 * * * certbot renew --quiet && docker compose -f /opt/grahvarta/docker-compose.yml exec nginx nginx -s reload
```

---

## Local Development

Use `docker-compose.local.yml` for local development:

```bash
docker compose -f docker-compose.local.yml up -d
```

**Differences from production:**
- No SSL (HTTP only)
- Database port 5432 exposed to host
- Backend port 3000 exposed to host
- No Let's Encrypt certs required
- `NODE_ENV=development`

Access:
- API: `http://localhost:3000`
- Admin portal: `http://localhost/admin`
- Astrologer portal: `http://localhost`
- Database: `localhost:5432`

---

## Monitoring & Logs

```bash
# All service logs
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f nginx

# Database logs
docker compose logs -f db

# Container status
docker compose ps
```

---

## Common Operations

### Restart a service
```bash
docker compose restart backend
```

### Rebuild and restart after code change
```bash
docker compose up -d --build backend
```

### Access database shell
```bash
docker compose exec db psql -U grahvarta_user -d grahvarta_db
```

### Access backend shell
```bash
docker compose exec backend sh
```

### View upload files
```bash
ls /opt/grahvarta/uploads/
```

### Scale backend (if needed in future)
```bash
docker compose up -d --scale backend=3
# Note: requires sticky session config in Nginx for Socket.io
```

---

## Flutter App Builds

Flutter apps are not built by Docker. Build them separately:

```bash
# User app (flutter_app)
cd flutter_app
flutter pub get
flutter build apk --release --split-per-abi

# Astrologer app
cd astrologer_app
flutter pub get
flutter build apk --release --split-per-abi

# Agent onboarding app
cd agent_onboarding_app
flutter pub get
flutter build apk --release
```

Output APKs: `build/app/outputs/flutter-apk/`

> The `astrologer_app` uses Codemagic CI/CD (see `codemagic.yaml`) for automated builds.

---

## Security Checklist

- [ ] `JWT_SECRET` is at least 32 random characters
- [ ] Database password is strong and not reused
- [ ] `.env` files are never committed to git
- [ ] SSL is valid and auto-renewal is configured
- [ ] `CORS_ORIGIN` is restricted to actual app domains
- [ ] `MAX_FILE_SIZE` limits file upload size (10 MB default)
- [ ] Rate limiting is active (200 req/15 min per IP)
- [ ] Razorpay webhook signature verification is enabled
- [ ] Firebase service account has minimum required permissions
