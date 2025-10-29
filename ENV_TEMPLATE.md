# 🔐 Environment Variables Template

## Quick Setup

```bash
# 1. Copy template to .env
cp .env.example .env

# 2. Generate secrets
openssl rand -hex 32  # BOT_API_SECRET
openssl rand -hex 32  # SESSION_SECRET
openssl rand -hex 32  # TELEGRAM_WEBHOOK_SECRET

# 3. Edit .env with your values
nano .env
```

---

## Required Variables

### Application
```env
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5000
```

### Database
```env
DATABASE_URL=postgresql://user:password@localhost:5432/shiftmanager
```

### Telegram Bot
```env
# Get from @BotFather
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=YourBotName_bot
```

### API Secrets
```env
# MUST be 32+ characters
BOT_API_SECRET=your_bot_api_secret_minimum_32_characters_required
SESSION_SECRET=your_session_secret_minimum_32_characters
```

---

## Optional Variables

### Supabase
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Redis (Production)
```env
REDIS_URL=redis://localhost:6379
# Or Upstash: redis://default:password@host:port
```

### Sentry Monitoring
```env
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
SENTRY_ENVIRONMENT=development
```

### Testing
```env
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/test
TEST_SECRET=test_secret
CODECOV_TOKEN=your_codecov_token
```

---

## Security Best Practices

1. **Generate Strong Secrets:**
   ```bash
   openssl rand -hex 32
   ```

2. **Never Commit Secrets:**
   - Add `.env` to `.gitignore`
   - Use `.env.example` for templates

3. **Rotate Regularly:**
   - Every 90 days minimum
   - After team member leaves
   - After suspected compromise

4. **Use Secrets Manager in Production:**
   - AWS Secrets Manager
   - HashiCorp Vault
   - dotenv-vault

5. **Set File Permissions:**
   ```bash
   chmod 600 .env
   ```

---

## Production Setup

### Using AWS Secrets Manager

```bash
# Store secrets
aws secretsmanager create-secret \
  --name shiftmanager/production \
  --secret-string file://secrets.json

# Load in application
export AWS_REGION=us-east-1
export AWS_SECRETS_MANAGER_SECRET_NAME=shiftmanager/production
```

### Using dotenv-vault

```bash
# Install
npm install -g dotenv-vault

# Login
npx dotenv-vault login

# Push secrets
npx dotenv-vault push

# In production
DOTENV_KEY="dotenv://:key_xxx" npm start
```

---

## Validation

Secrets are automatically validated on startup. Check logs:

```
✅ Secrets loaded and validated successfully
❌ Missing critical secrets: DATABASE_URL, TELEGRAM_BOT_TOKEN
⚠️  BOT_API_SECRET is too short. Recommended: 32+ characters
```

---

## Example .env File

```env
# Application
NODE_ENV=development
PORT=5000
APP_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/shiftmanager

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_BOT_USERNAME=MyShiftBot

# Secrets (generate with: openssl rand -hex 32)
BOT_API_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
SESSION_SECRET=p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1

# Redis (optional)
REDIS_URL=redis://localhost:6379

# Sentry (optional)
SENTRY_DSN=https://abc123@sentry.io/123456
```

---

Last Updated: 2025-10-29

