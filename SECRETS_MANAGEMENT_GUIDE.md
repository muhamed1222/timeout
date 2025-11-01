# 🔐 Secrets Management Guide

## Overview

Comprehensive guide for secure secret management across all environments.

**Key Features:**
- ✅ Automatic secret validation
- ✅ Type-safe secret access
- ✅ Secret strength checking
- ✅ Rotation support
- ✅ Production-ready (AWS Secrets Manager)
- ✅ Development-friendly (dotenv)

---

## 🚀 Quick Start

### 1. Generate Secrets

```bash
# Run generator script
./scripts/generate-secrets.sh

# Or manually generate
openssl rand -hex 32
```

### 2. Create .env File

```bash
# Copy template
cp ENV_TEMPLATE.md .env

# Edit with your values
nano .env
```

### 3. Set Required Variables

```env
# Minimum required
DATABASE_URL=postgresql://user:pass@localhost:5432/db
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...
BOT_API_SECRET=<generated-32-char-secret>
```

---

## 📁 File Structure

```
/timeout
├── .env                          # Local secrets (NEVER commit!)
├── .env.example                  # Template (safe to commit)
├── ENV_TEMPLATE.md               # Documentation
├── server/lib/secrets.ts         # Secret management logic
└── scripts/generate-secrets.sh   # Secret generator
```

---

## 🔧 Usage

### Loading Secrets

```typescript
import { loadSecrets, getSecret } from './lib/secrets';

// Load all secrets (with validation)
const secrets = loadSecrets();

// Get specific secret
const botToken = getSecret('TELEGRAM_BOT_TOKEN');
const dbUrl = getSecret('DATABASE_URL');
```

### Environment Checks

```typescript
import { isProduction, isDevelopment, isTest } from './lib/secrets';

if (isProduction()) {
  // Production-specific logic
  setupAWSSecretsManager();
}

if (isDevelopment()) {
  // Development-specific logic
  enableDebugLogging();
}
```

### Masking Secrets

```typescript
import { maskSecret } from './lib/secrets';

const apiKey = 'abcdef1234567890ghijklmn';
console.log(maskSecret(apiKey));
// Output: abcd****klmn
```

### Debug Secrets

```typescript
import { getRedactedSecrets } from './lib/secrets';

// Get all secrets with masked values
const secrets = getRedactedSecrets();
console.log(secrets);
// {
//   DATABASE_URL: "post****5432",
//   BOT_API_SECRET: "a1b2****o5p6",
//   ...
// }
```

---

## ✅ Validation

### Automatic Validation

Secrets are validated on application startup:

```typescript
import { validateSecretsOnStartup } from './lib/secrets';

// Called automatically in production
validateSecretsOnStartup();
```

**Checks:**
- ✅ All required secrets present
- ✅ Correct format (URLs, tokens)
- ✅ Minimum length requirements
- ✅ No weak secrets in production
- ✅ Type validation with Zod

### Validation Rules

```typescript
// Schema (server/lib/secrets.ts)
const secretsSchema = z.object({
  DATABASE_URL: z.string().url(),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  BOT_API_SECRET: z.string().min(32),
  PORT: z.string().regex(/^\d+$/),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  // ...
});
```

---

## 🔄 Secret Rotation

### Development

```typescript
import { rotateSecret } from './lib/secrets';

// Rotate in development
await rotateSecret('BOT_API_SECRET', newSecretValue);
```

### Production

**AWS Secrets Manager:**

```bash
# Update secret
aws secretsmanager update-secret \
  --secret-id shiftmanager/production \
  --secret-string '{"BOT_API_SECRET":"new_value"}'

# Restart application to load new secrets
kubectl rollout restart deployment/shiftmanager
```

**Rotation Schedule:**
- 🔄 Every 90 days (recommended)
- 🔄 After team member leaves
- 🔄 After suspected compromise
- 🔄 After security audit

---

## 🏭 Production Setup

### Option 1: AWS Secrets Manager (Recommended)

#### Setup

```bash
# Create secret
aws secretsmanager create-secret \
  --name shiftmanager/production \
  --description "Shift Manager Production Secrets" \
  --secret-string file://secrets.json
```

**secrets.json:**
```json
{
  "DATABASE_URL": "postgresql://...",
  "TELEGRAM_BOT_TOKEN": "...",
  "BOT_API_SECRET": "...",
  "REDIS_URL": "...",
  "SENTRY_DSN": "..."
}
```

#### Load in Application

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function loadSecretsFromAWS() {
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: process.env.AWS_SECRETS_MANAGER_SECRET_NAME,
    })
  );
  
  const secrets = JSON.parse(response.SecretString!);
  
  // Set environment variables
  Object.assign(process.env, secrets);
}
```

#### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:shiftmanager/*"
    }
  ]
}
```

---

### Option 2: dotenv-vault

#### Setup

```bash
# Install
npm install dotenv-vault-core

# Login
npx dotenv-vault login

# Push secrets
npx dotenv-vault push production
```

#### Deploy

```bash
# Get production key
npx dotenv-vault keys production

# Set in environment
export DOTENV_KEY="dotenv://:key_xxx"

# Start app (automatically loads encrypted secrets)
npm start
```

---

### Option 3: HashiCorp Vault

#### Setup

```bash
# Write secrets
vault kv put secret/shiftmanager/production \
  DATABASE_URL="postgresql://..." \
  BOT_API_SECRET="..."
```

#### Load in Application

```typescript
import vault from 'node-vault';

const client = vault({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function loadSecretsFromVault() {
  const { data } = await client.read('secret/data/shiftmanager/production');
  Object.assign(process.env, data.data);
}
```

---

## 🔒 Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.*.local" >> .gitignore
```

### 2. Use Strong Secrets

```bash
# Generate 32+ character secrets
openssl rand -hex 32

# Or use password generator
pwgen -s 64 1
```

### 3. Set File Permissions

```bash
# Restrict .env access
chmod 600 .env

# Owner read/write only
ls -la .env
# -rw------- 1 user user 1234 Oct 29 12:00 .env
```

### 4. Use Different Secrets Per Environment

```
.env.development    # Local development
.env.staging        # Staging environment
.env.production     # Production (use Secrets Manager)
```

### 5. Audit Secret Access

```typescript
import { auditLogger } from './lib/audit';

// Log secret access
function accessSecret(secretName: string) {
  auditLogger.log({
    action: 'secret.accessed',
    resource_type: 'secret',
    resource_id: secretName,
    actor_type: 'system',
    result: 'success',
  });
  
  return getSecret(secretName);
}
```

---

## 🧪 Testing

### Test Environment

```env
# .env.test
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/test
BOT_API_SECRET=test_secret_minimum_32_characters_required
TELEGRAM_BOT_TOKEN=test_token
```

### Mock Secrets in Tests

```typescript
import { vi } from 'vitest';

vi.mock('../lib/secrets', () => ({
  getSecret: vi.fn((key) => {
    const mockSecrets = {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      BOT_API_SECRET: 'test_secret_123456789012345678',
      TELEGRAM_BOT_TOKEN: 'test_token',
    };
    return mockSecrets[key];
  }),
  isProduction: vi.fn(() => false),
  isDevelopment: vi.fn(() => false),
  isTest: vi.fn(() => true),
}));
```

---

## 📊 Monitoring

### Secret Expiration Alerts

```typescript
// Track secret age
const secretCreatedAt = new Date('2025-10-29');
const daysSinceCreation = (Date.now() - secretCreatedAt.getTime()) / (1000 * 60 * 60 * 24);

if (daysSinceCreation > 90) {
  logger.warn('Secret needs rotation', {
    secretName: 'BOT_API_SECRET',
    age: daysSinceCreation,
  });
  
  // Send alert
  await sendAlert('Secret rotation required: BOT_API_SECRET');
}
```

### Secret Access Logging

```typescript
// Log all secret accesses
const originalGetSecret = getSecret;
getSecret = function(key) {
  logger.debug('Secret accessed', {
    key,
    timestamp: new Date(),
    caller: new Error().stack?.split('\n')[2],
  });
  
  return originalGetSecret(key);
};
```

---

## 🐛 Troubleshooting

### Missing Secrets Error

```
Error: Missing or invalid environment variables: DATABASE_URL, BOT_API_SECRET
```

**Solution:**
1. Check `.env` file exists
2. Verify all required variables are set
3. Run `./scripts/generate-secrets.sh`

### Secret Too Short

```
Warning: BOT_API_SECRET is too short. Recommended: 32+ characters
```

**Solution:**
```bash
# Generate new 32+ char secret
openssl rand -hex 32
```

### Weak Secret in Production

```
Error: Weak or default secret detected in production!
```

**Solution:**
- Never use default secrets in production
- Generate cryptographically secure secrets
- Don't use words like "password", "secret", "test"

---

## 📝 Checklist

### Development Setup
- [ ] Copy ENV_TEMPLATE.md to .env
- [ ] Run `./scripts/generate-secrets.sh`
- [ ] Set DATABASE_URL
- [ ] Set TELEGRAM_BOT_TOKEN
- [ ] Verify secrets with `npm run check`

### Production Deployment
- [ ] Set up AWS Secrets Manager / Vault
- [ ] Generate production secrets (different from dev!)
- [ ] Set IAM permissions
- [ ] Test secret loading
- [ ] Enable secret rotation
- [ ] Set up monitoring alerts
- [ ] Document rotation schedule

### Security Audit
- [ ] No secrets in version control
- [ ] File permissions set (600)
- [ ] Strong secrets (32+ chars)
- [ ] Different per environment
- [ ] Rotation schedule defined
- [ ] Access logging enabled
- [ ] Monitoring configured

---

## 📚 Resources

- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [dotenv-vault](https://www.dotenv.org/docs/security/env-vault)
- [HashiCorp Vault](https://www.vaultproject.io/)
- [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

---

**Last Updated:** 2025-10-29  
**Version:** 1.0  
**Status:** ✅ Production-ready





