# 🚀 ShiftManager Deployment Guide

**Version:** 1.0.0  
**Last Updated:** 29 октября 2025  
**Status:** Production Ready

---

## 📋 TABLE OF CONTENTS

1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Manual Deployment](#manual-deployment)
4. [Cloud Deployment](#cloud-deployment)
5. [Post-Deployment](#post-deployment)
6. [Troubleshooting](#troubleshooting)

---

## 🎯 PREREQUISITES

### Required
- ✅ Docker 20.10+ and Docker Compose 2.0+
- ✅ Node.js 20+ (for local builds)
- ✅ PostgreSQL database (Supabase recommended)
- ✅ Telegram Bot Token
- ✅ Domain name (for production)

### Optional
- Redis (for caching and rate limiting)
- SSL certificate (Let's Encrypt recommended)
- AWS account (for backups)
- Sentry account (for error tracking)

---

## ⚡ QUICK START

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo-url>
cd timeout

# Install dependencies
npm install

# Copy environment file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

### 2. Configure Environment Variables

**Required variables in `.env.production`:**

```bash
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=YourBotUsername

# Security (generate with: openssl rand -hex 32)
BOT_API_SECRET=your-32-char-secret
SESSION_SECRET=your-32-char-secret

# URLs
APP_URL=https://your-domain.com
FRONTEND_URL=https://your-domain.com
```

### 3. Deploy

```bash
# Run automated deployment
./scripts/deploy.sh production

# Or manually with Docker Compose
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### 4. Verify

```bash
# Check health
curl http://localhost:5000/api/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

---

## 🔧 MANUAL DEPLOYMENT

### Step 1: Pre-deployment Checks

```bash
# Run TypeScript check
npm run check

# Run tests
npm test

# Run linter
npm run lint
```

### Step 2: Build Production Assets

```bash
# Build frontend and backend
npm run build

# Verify build
ls -la dist/
```

### Step 3: Build Docker Image

```bash
# Build image
docker build -t shiftmanager:latest .

# Tag for registry (if using)
docker tag shiftmanager:latest your-registry/shiftmanager:latest

# Push to registry (if using)
docker push your-registry/shiftmanager:latest
```

### Step 4: Deploy with Docker Compose

```bash
# Start services
docker-compose -f docker-compose.prod.yml up -d

# Check status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 5: Run Database Migrations

```bash
# Inside container
docker-compose -f docker-compose.prod.yml exec app npm run db:migrate

# Or from host
npm run db:migrate
```

---

## ☁️ CLOUD DEPLOYMENT

### Option 1: AWS EC2

#### 1. Launch EC2 Instance

```bash
# Ubuntu 22.04 LTS
# t3.medium (2 vCPU, 4 GB RAM) minimum
# 30 GB SSD storage
```

#### 2. Install Dependencies

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
```

#### 3. Setup Application

```bash
# Clone repository
git clone <your-repo-url>
cd timeout

# Setup environment
cp .env.production.example .env.production
nano .env.production

# Deploy
./scripts/deploy.sh production
```

#### 4. Configure Nginx & SSL

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Certbot will auto-configure nginx
```

---

### Option 2: DigitalOcean App Platform

#### 1. Create App

```bash
# Via CLI
doctl apps create --spec .do/app.yaml

# Or via web interface:
# 1. Go to Apps → Create App
# 2. Select GitHub repository
# 3. Configure environment variables
# 4. Deploy
```

#### 2. App Spec (`.do/app.yaml`)

```yaml
name: shiftmanager
services:
  - name: app
    github:
      repo: your-username/timeout
      branch: main
      deploy_on_push: true
    build_command: npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xs
    envs:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        value: ${DATABASE_URL}
      # ... more env vars
    health_check:
      http_path: /api/health
databases:
  - name: db
    engine: PG
    version: "15"
```

---

### Option 3: Vercel (Frontend) + Railway (Backend)

#### Frontend on Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
```

#### Backend on Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Deploy
railway up

# Configure environment variables
railway variables set DATABASE_URL=postgresql://...
```

---

### Option 4: Docker Hub + VPS

#### 1. Build and Push to Docker Hub

```bash
# Login
docker login

# Build
docker build -t your-username/shiftmanager:latest .

# Push
docker push your-username/shiftmanager:latest
```

#### 2. Deploy on VPS

```bash
# SSH to VPS
ssh user@your-server.com

# Pull image
docker pull your-username/shiftmanager:latest

# Run container
docker run -d \
  -p 5000:5000 \
  --env-file .env.production \
  --name shiftmanager \
  your-username/shiftmanager:latest
```

---

## 🔐 SECURITY SETUP

### 1. Generate Secure Secrets

```bash
# Generate 32-char secrets
openssl rand -hex 32  # BOT_API_SECRET
openssl rand -hex 32  # SESSION_SECRET
openssl rand -hex 32  # TELEGRAM_WEBHOOK_SECRET
```

### 2. Configure Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 3. Setup SSL Certificate

```bash
# Let's Encrypt (recommended)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 4. Configure Telegram Webhook

```bash
# Set webhook URL
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://your-domain.com/api/bot/webhook"}'

# Verify webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

---

## 📊 POST-DEPLOYMENT

### 1. Health Checks

```bash
# Application health
curl https://your-domain.com/api/health

# Database health
curl https://your-domain.com/api/health/db

# Redis health
curl https://your-domain.com/api/health/redis
```

### 2. Setup Monitoring

```bash
# Configure Sentry
# Add SENTRY_DSN to .env.production

# View Prometheus metrics
curl https://your-domain.com/api/metrics

# Setup Grafana dashboard (optional)
docker run -d -p 3000:3000 grafana/grafana
```

### 3. Configure Backups

```bash
# Setup automated backups
./scripts/setup-backup-cron.sh production

# Test backup
./scripts/backup-database.sh production

# Test restore
./scripts/restore-database.sh <backup-file> production
```

### 4. Performance Tuning

```bash
# Enable Redis caching
# Set REDIS_URL in environment

# Configure CDN (optional)
# Use Cloudflare or similar for static assets

# Database indexes
# Already configured in migrations
```

---

## 🔍 MONITORING & LOGS

### View Application Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# App only
docker-compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker-compose -f docker-compose.prod.yml logs --tail=100 app
```

### View System Metrics

```bash
# Container stats
docker stats

# Disk usage
df -h

# Memory usage
free -h

# CPU usage
htop
```

### Error Tracking

```bash
# Sentry dashboard
# https://sentry.io/organizations/your-org/projects/

# Application errors
docker-compose -f docker-compose.prod.yml logs app | grep ERROR
```

---

## 🐛 TROUBLESHOOTING

### Container Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs app

# Check container status
docker-compose -f docker-compose.prod.yml ps

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### Database Connection Issues

```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec app \
  node -e "const { drizzle } = require('drizzle-orm/node-postgres'); console.log('Connected');"

# Check DATABASE_URL format
echo $DATABASE_URL
# Should be: postgresql://user:password@host:5432/database
```

### Health Check Failing

```bash
# Check if app is responding
curl -v http://localhost:5000/api/health

# Check container health
docker inspect <container-id> | grep -A 20 Health

# Manual health check
docker-compose -f docker-compose.prod.yml exec app \
  curl http://localhost:5000/api/health
```

### High Memory Usage

```bash
# Check container memory
docker stats

# Restart containers
docker-compose -f docker-compose.prod.yml restart

# Adjust memory limits in docker-compose.prod.yml
```

### SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate
openssl s_client -connect your-domain.com:443

# Restart nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

---

## 📞 SUPPORT

### Documentation
- 📚 [README.md](README.md) - Project overview
- 🔐 [SECRETS_MANAGEMENT_REPORT.md](SECRETS_MANAGEMENT_REPORT.md)
- ✅ [VALIDATION_REPORT.md](VALIDATION_REPORT.md)

### Resources
- 🐛 GitHub Issues: <your-repo-url>/issues
- 📧 Email: support@example.com
- 💬 Telegram: @YourSupportBot

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All tests passing
- [ ] TypeScript compilation successful
- [ ] Environment variables configured
- [ ] Secrets generated (32+ characters)
- [ ] Database accessible
- [ ] Domain DNS configured

### Deployment
- [ ] Docker images built
- [ ] Containers started
- [ ] Health checks passing
- [ ] SSL certificate installed
- [ ] Nginx configured

### Post-Deployment
- [ ] Telegram webhook configured
- [ ] Backup automation setup
- [ ] Monitoring configured (Sentry)
- [ ] Logs accessible
- [ ] Performance metrics tracked
- [ ] Documentation updated

---

**Status:** ✅ Ready for Production  
**Last Updated:** 29 октября 2025  
**Version:** 1.0.0 🚀
