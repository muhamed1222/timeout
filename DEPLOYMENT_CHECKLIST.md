# ✅ Pre-Deployment Checklist

Complete this checklist before deploying to production.

## 🧪 Code Quality

- [ ] All tests pass
  ```bash
  npm run test:unit
  npm run test:e2e
  ```

- [ ] No TypeScript errors
  ```bash
  npm run check
  ```

- [ ] Build succeeds
  ```bash
  npm run build
  ```

- [ ] Code formatted
  ```bash
  npm run format:check
  ```

## 🔐 Environment Configuration

- [ ] All required environment variables set
  - [ ] `NODE_ENV=production`
  - [ ] `DATABASE_URL`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `TELEGRAM_BOT_TOKEN`
  - [ ] `TELEGRAM_BOT_USERNAME`
  - [ ] `BOT_API_SECRET` (32+ chars)
  - [ ] `SESSION_SECRET` (32+ chars)
  - [ ] `REDIS_URL` (for production)
  - [ ] `APP_URL`

- [ ] Secrets generated securely
  ```bash
  openssl rand -hex 32
  ```

- [ ] `.env` file not committed to git
  ```bash
  git status | grep -q ".env" && echo "WARNING: .env in git!"
  ```

## 🗄️ Database

- [ ] Database created and accessible
  ```bash
  psql $DATABASE_URL -c "SELECT 1"
  ```

- [ ] Migrations ready
  ```bash
  npm run db:push
  ```

- [ ] Backup strategy configured
  - [ ] Automated backups enabled
  - [ ] Backup restoration tested

## 🤖 Telegram Bot

- [ ] Bot created via @BotFather
- [ ] Bot token obtained
- [ ] Bot username configured
- [ ] Bot commands set
  ```bash
  /start - Начать работу
  /help - Помощь
  /status - Статус смены
  ```

## 📦 Redis

- [ ] Redis instance available
  ```bash
  redis-cli -u $REDIS_URL ping
  # Expected: PONG
  ```

- [ ] Redis URL configured
  - Vercel: Use Upstash Redis
  - Docker: Included in docker-compose
  - VPS: Install Redis or use cloud

## 🔧 Infrastructure

### Vercel
- [ ] Vercel account created
- [ ] Project connected to GitHub
- [ ] Environment variables set in Vercel dashboard
- [ ] Domain configured (optional)

### Docker
- [ ] Docker installed
- [ ] docker-compose.yml configured
- [ ] .env file created
- [ ] Redis service included

### VPS
- [ ] Server accessible via SSH
- [ ] Docker installed
- [ ] Nginx installed and configured
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] Firewall configured
- [ ] Domain DNS configured

## 📊 Monitoring (Optional but Recommended)

- [ ] Sentry project created
  - [ ] `SENTRY_DSN` configured
  - [ ] Error alerts configured

- [ ] Prometheus metrics enabled
  - [ ] `/metrics` endpoint accessible
  - [ ] Grafana dashboard configured (optional)

## 🔒 Security

- [ ] HTTPS enabled
- [ ] Security headers configured (Helmet.js)
- [ ] Rate limiting enabled
- [ ] CSRF protection enabled
- [ ] Input validation with Zod
- [ ] Audit logging enabled
- [ ] Secrets are strong (32+ characters)

## 🚀 Deployment

- [ ] Deployment method chosen
  - [ ] Vercel
  - [ ] Docker
  - [ ] VPS

- [ ] CI/CD pipeline configured
  - [ ] GitHub Actions workflow
  - [ ] Secrets added to GitHub
  - [ ] Tests run on push

- [ ] Deployment tested in staging (if available)

## ✅ Post-Deployment

- [ ] Health check passes
  ```bash
  curl https://your-domain.com/api/health
  # Expected: {"status":"ok"}
  ```

- [ ] Readiness check passes
  ```bash
  curl https://your-domain.com/api/health/ready
  # Expected: {"status":"ready"}
  ```

- [ ] Database accessible
  - [ ] Can register new user
  - [ ] Can create employee

- [ ] Telegram webhook set
  ```bash
  curl -X POST https://your-domain.com/api/telegram/webhook/setup \
    -H "X-Bot-Secret: YOUR_BOT_SECRET"
  ```

- [ ] Bot responds to commands
  - [ ] Send `/start` to bot
  - [ ] Bot replies with welcome message

- [ ] WebSocket works
  - [ ] Open app in browser
  - [ ] Check browser console: `WebSocket connected`

- [ ] Redis cache working
  - [ ] Check logs: No "falling back to memory" warnings

- [ ] Monitoring active
  - [ ] Sentry receiving events
  - [ ] Metrics being collected

## 📝 Documentation

- [ ] README.md updated
- [ ] DEPLOYMENT_GUIDE.md reviewed
- [ ] API_DOCUMENTATION.md accessible
- [ ] Environment variables documented

## 🎯 Critical User Flows Tested

- [ ] User registration
  ```bash
  POST /api/auth/register
  ```

- [ ] Employee creation
  ```bash
  POST /api/companies/{id}/employees
  ```

- [ ] Telegram linking
  - [ ] Generate invite code
  - [ ] Link via bot

- [ ] Shift lifecycle
  - [ ] Start shift
  - [ ] Start break
  - [ ] End break
  - [ ] End shift

- [ ] Rating system
  - [ ] View ratings
  - [ ] Create violation
  - [ ] Rating updates

- [ ] Real-time updates
  - [ ] Dashboard WebSocket
  - [ ] Live statistics

## 🚨 Rollback Plan

- [ ] Previous version tagged
  ```bash
  git tag -a v1.0.0 -m "Release 1.0.0"
  ```

- [ ] Rollback procedure documented
  - Vercel: Use dashboard or `vercel rollback`
  - Docker: Keep previous image tags
  - Database: Migration rollback script ready

- [ ] Backup taken before deployment
  ```bash
  ./scripts/backup-database.sh
  ```

## 📞 Support Contacts

- [ ] On-call person assigned
- [ ] Emergency contacts documented
- [ ] Escalation path defined

---

## Quick Commands

### Run All Checks
```bash
# Tests
npm test

# Type check
npm run check

# Build
npm run build

# Format check
npm run format:check
```

### Deploy
```bash
# Vercel
vercel --prod

# Docker
docker-compose up -d && docker-compose exec app npm run db:push

# VPS
ssh user@server "cd /opt/app && git pull && docker-compose up -d"
```

### Health Checks
```bash
# Application
curl https://your-domain.com/api/health

# Database
psql $DATABASE_URL -c "SELECT 1"

# Redis
redis-cli -u $REDIS_URL ping

# Bot webhook
curl https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo
```

---

## Success Criteria

✅ **Your deployment is successful when:**

1. ✅ All health checks pass
2. ✅ User can register and login
3. ✅ Employee can be created
4. ✅ Telegram bot responds
5. ✅ Shifts can be started/ended
6. ✅ WebSocket connects
7. ✅ No errors in logs
8. ✅ Monitoring is active

---

## If Something Goes Wrong

1. **Check logs immediately**
   ```bash
   # Vercel
   vercel logs
   
   # Docker
   docker-compose logs -f app
   
   # VPS
   journalctl -u docker -f
   ```

2. **Verify environment variables**
   ```bash
   # Check all required vars are set
   env | grep DATABASE_URL
   env | grep REDIS_URL
   ```

3. **Test individual components**
   ```bash
   # Database
   psql $DATABASE_URL -c "SELECT 1"
   
   # Redis
   redis-cli -u $REDIS_URL ping
   
   # Telegram
   curl https://api.telegram.org/bot$TOKEN/getMe
   ```

4. **Rollback if needed**
   ```bash
   # Vercel
   vercel rollback
   
   # Docker
   docker-compose down
   docker-compose up -d previous-image-tag
   
   # Database
   ./migrations/rollback.sh
   ```

5. **Check documentation**
   - DEPLOYMENT_GUIDE.md - Complete guide
   - TROUBLESHOOTING.md - Common issues
   - API_DOCUMENTATION.md - API reference

---

**Ready to deploy? Let's go! 🚀**

