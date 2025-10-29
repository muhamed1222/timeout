# ⚡ Quick Deploy Guide

Fast deployment instructions for each platform.

## 🚀 Vercel (5 minutes)

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
```bash
vercel
```

### 4. Set Environment Variables
```bash
vercel env add NODE_ENV production
vercel env add DATABASE_URL <your-supabase-url>
vercel env add SUPABASE_URL <url>
vercel env add SUPABASE_ANON_KEY <key>
vercel env add SUPABASE_SERVICE_ROLE_KEY <key>
vercel env add TELEGRAM_BOT_TOKEN <token>
vercel env add TELEGRAM_BOT_USERNAME <username>
vercel env add BOT_API_SECRET <generate-with: openssl rand -hex 32>
vercel env add SESSION_SECRET <generate-with: openssl rand -hex 32>
vercel env add REDIS_URL <upstash-redis-url>
```

### 5. Deploy to Production
```bash
vercel --prod
```

### 6. Setup Telegram Webhook
```bash
curl -X POST https://your-domain.vercel.app/api/telegram/webhook/setup \
  -H "X-Bot-Secret: YOUR_BOT_SECRET"
```

✅ **Done!** Your app is live at: `https://your-domain.vercel.app`

---

## 🐳 Docker (10 minutes)

### 1. Clone Repository
```bash
git clone <your-repo>
cd timeout
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env  # Add your values
```

### 3. Start Services
```bash
docker-compose up -d
```

### 4. Run Migrations
```bash
docker-compose exec app npm run db:push
```

### 5. Check Status
```bash
docker-compose ps
curl http://localhost:5000/api/health
```

✅ **Done!** Your app is running at: `http://localhost:5000`

---

## 🖥️ VPS (15 minutes)

### 1. Connect to Server
```bash
ssh root@your-server-ip
```

### 2. Install Docker
```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Clone and Setup
```bash
mkdir -p /opt/shiftmanager
cd /opt/shiftmanager
git clone <your-repo> .
cp .env.example .env
nano .env  # Configure
```

### 4. Start Application
```bash
docker-compose up -d
```

### 5. Setup Nginx
```bash
apt install nginx certbot python3-certbot-nginx -y

cat > /etc/nginx/sites-available/shiftmanager <<'EOF'
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
EOF

ln -s /etc/nginx/sites-available/shiftmanager /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx
```

### 6. Setup SSL
```bash
certbot --nginx -d your-domain.com
```

✅ **Done!** Your app is live at: `https://your-domain.com`

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

### Code Ready
- [ ] All tests pass: `npm test`
- [ ] No linter errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] TypeScript compiles: `npm run check`

### Services Ready
- [ ] Supabase project created
- [ ] Telegram bot created (@BotFather)
- [ ] Redis instance ready (Upstash for Vercel)
- [ ] Sentry project created (optional)

### Configuration Ready
- [ ] All environment variables set
- [ ] Secrets generated (32+ chars)
- [ ] Domain configured (if applicable)
- [ ] SSL certificate ready (VPS)

---

## 🔐 Required Environment Variables

Minimum configuration needed:

```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_BOT_USERNAME=...
BOT_API_SECRET=...  # openssl rand -hex 32
SESSION_SECRET=...   # openssl rand -hex 32
REDIS_URL=redis://...  # Required for production
APP_URL=https://your-domain.com
```

---

## 🧪 Post-Deployment Tests

After deployment, verify:

### 1. Health Checks
```bash
curl https://your-domain.com/api/health
# Expected: {"status":"ok"}

curl https://your-domain.com/api/health/ready
# Expected: {"status":"ready"}
```

### 2. Database Connection
```bash
# Register a test user
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123456",
    "company_name": "Test Company",
    "full_name": "Test User"
  }'
```

### 3. Telegram Bot
```bash
# Send /start to your bot
# Expected: Bot responds with welcome message
```

### 4. WebSocket
```javascript
// Open browser console on your domain
const ws = new WebSocket('wss://your-domain.com/ws?companyId=xxx');
ws.onopen = () => console.log('✅ WebSocket connected');
```

---

## 🔧 Quick Fixes

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm ci
npm run build
```

### Database Connection Fails
```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# If fails, verify DATABASE_URL format:
# postgresql://user:password@host:port/database
```

### Redis Connection Fails
```bash
# Test Redis
redis-cli -u $REDIS_URL ping

# For Vercel, use Upstash Redis
# https://upstash.com/
```

### Telegram Bot Not Working
```bash
# Check webhook status
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo

# Reset webhook
curl -X POST https://your-domain.com/api/telegram/webhook/setup \
  -H "X-Bot-Secret: $BOT_API_SECRET"
```

---

## 📚 Next Steps

After successful deployment:

1. **Setup Monitoring**
   - Configure Sentry alerts
   - Setup Grafana dashboards
   - Enable Prometheus metrics

2. **Configure Backups**
   ```bash
   # Setup daily backups
   crontab -e
   # Add: 0 2 * * * /opt/shiftmanager/scripts/cron-backup.sh
   ```

3. **Performance Tuning**
   - Enable Redis caching
   - Configure CDN
   - Optimize database indexes

4. **Security Hardening**
   - Review security headers
   - Setup firewall rules
   - Enable audit logging

---

## 🆘 Getting Help

**If deployment fails:**

1. Check logs:
   - Vercel: `vercel logs`
   - Docker: `docker-compose logs -f app`
   - VPS: `journalctl -u docker -f`

2. Verify environment variables:
   ```bash
   # Vercel
   vercel env ls
   
   # Docker
   docker-compose exec app env
   ```

3. Review error messages in:
   - Build logs
   - Application logs
   - Sentry dashboard

4. See full documentation:
   - `DEPLOYMENT_GUIDE.md` - Complete guide
   - `TROUBLESHOOTING.md` - Common issues
   - `README.md` - Project overview

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ Health check returns 200
- ✅ Can register new user
- ✅ Can create employee
- ✅ Telegram bot responds
- ✅ WebSocket connects
- ✅ No errors in logs
- ✅ Monitoring working

**Congratulations! Your app is live! 🎉**

---

## 🚀 One-Line Deployments

### Vercel
```bash
npx vercel --prod
```

### Docker
```bash
docker-compose up -d && docker-compose exec app npm run db:push
```

### Git Push (with CI/CD)
```bash
git push origin main  # Automatic deployment via GitHub Actions
```

That's it! Choose your platform and deploy! 🚀

