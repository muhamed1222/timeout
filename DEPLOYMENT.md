# 🚀 ShiftManager - Deployment Guide

Comprehensive deployment guide for ShiftManager application.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Options](#deployment-options)
  - [Option 1: Vercel (Recommended)](#option-1-vercel-recommended)
  - [Option 2: Docker](#option-2-docker)
  - [Option 3: VPS/Cloud](#option-3-vpscloud)
- [Database Setup](#database-setup)
- [Telegram Bot Setup](#telegram-bot-setup)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 20+ installed
- PostgreSQL database (Supabase recommended)
- Supabase account for authentication
- Telegram Bot Token (optional, for Telegram integration)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:port/database

# Supabase (Required)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Frontend (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Telegram Bot (Optional)
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_BOT_USERNAME=@your_bot

# Server
PORT=5000
NODE_ENV=production
```

---

## Deployment Options

### Option 1: Vercel (Recommended)

**Pros:** Easy setup, automatic SSL, serverless, free tier available

#### Steps:

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Configure environment variables**
   - Add all variables from `.env.example` in Vercel dashboard
   - Navigate to: Settings → Environment Variables

4. **Deploy**
   - Vercel will automatically build and deploy
   - Your app will be available at `https://your-app.vercel.app`

5. **Run database migrations**
   ```bash
   npm run db:push
   ```

#### Vercel Configuration

The project includes `vercel.json` for proper routing:
- API requests → `/api/*` → Serverless functions
- Frontend requests → `/*` → Static files

---

### Option 2: Docker

**Pros:** Consistent environment, easy scaling, works anywhere

#### Steps:

1. **Build Docker image**
   ```bash
   docker build -t shiftmanager:latest .
   ```

2. **Run with docker-compose**
   ```bash
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your values
   nano .env
   
   # Start services
   docker-compose up -d
   ```

3. **Access application**
   - Application: `http://localhost:5000`

4. **View logs**
   ```bash
   docker-compose logs -f app
   ```

5. **Stop services**
   ```bash
   docker-compose down
   ```

---

### Option 3: VPS/Cloud (Railway, Fly.io, DigitalOcean)

**Pros:** Full control, persistent storage, no cold starts

#### General Steps:

1. **Prepare VPS**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Clone and setup**
   ```bash
   git clone <your-repo>
   cd shiftmanager
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env  # Fill in your values
   ```

4. **Build application**
   ```bash
   npm run build
   ```

5. **Run with PM2**
   ```bash
   pm2 start dist/index.js --name shiftmanager
   pm2 save
   pm2 startup  # Follow instructions
   ```

6. **Setup Nginx reverse proxy** (optional)
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Database Setup

### Using Supabase (Recommended)

1. **Create project** at [supabase.com](https://supabase.com)

2. **Get credentials** from Settings → API:
   - Project URL
   - anon/public key
   - service_role key

3. **Run migrations**
   ```bash
   # In Supabase SQL Editor, run files from migrations/ folder
   # Or use Drizzle:
   npm run db:push
   ```

4. **Verify tables**
   - Check Tables section in Supabase dashboard
   - Should see: company, employee, shift, etc.

---

## Telegram Bot Setup

### 1. Create Bot

1. **Open Telegram** and search for `@BotFather`

2. **Create new bot**
   ```
   /newbot
   ```
   Follow prompts to set name and username

3. **Save bot token**
   - Copy the token provided
   - Add to `.env` as `TELEGRAM_BOT_TOKEN`

### 2. Configure Bot

```bash
# Set bot commands
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setMyCommands" \
  -H "Content-Type: application/json" \
  -d '{
    "commands": [
      {"command": "start", "description": "Start working with bot"},
      {"command": "status", "description": "Check current shift status"},
      {"command": "help", "description": "Show help message"}
    ]
  }'
```

### 3. Set Webhook (for production)

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://your-domain.com/api/telegram/webhook"}'
```

---

## Post-Deployment

### 1. Create First Admin Account

Visit your deployed app and register:
- Email: your-email@example.com
- Password: Strong password
- Company name: Your Company
- Full name: Your Name

### 2. Create Demo Account (optional)

```bash
npm run scripts/create-demo-admin.ts
```

### 3. Test Telegram Integration

1. Search for your bot in Telegram
2. Send `/start` command
3. Create invite link for employee in web dashboard
4. Use invite link in Telegram to connect employee

### 4. Monitor Application

**Vercel:**
- View logs in Vercel dashboard
- Set up monitoring alerts

**Docker/VPS:**
```bash
# View logs
pm2 logs shiftmanager

# Monitor resources
pm2 monit
```

---

## Troubleshooting

### Issue: "Failed to fetch" on login

**Solution:**
- Check that Supabase project is active (not paused)
- Verify `SUPABASE_URL` and keys are correct
- Check browser console for CORS errors

### Issue: Database connection timeout

**Solution:**
- Verify `DATABASE_URL` is correct
- Check that IP is whitelisted in Supabase
- Test connection: `npm run scripts/debug-query.ts`

### Issue: Telegram bot not responding

**Solution:**
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check webhook is set: 
  ```bash
  curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
  ```
- View bot logs in application logs

### Issue: Cold starts on Vercel

**Solution:**
- This is normal for serverless
- Consider upgrading to Vercel Pro
- Or migrate to VPS for persistent server

### Issue: Build fails

**Solution:**
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

---

## Support

- GitHub Issues: [your-repo]/issues
- Documentation: README.md
- API Docs: AUDIT.md

---

**Last Updated:** 2025
**Version:** 1.0.0

