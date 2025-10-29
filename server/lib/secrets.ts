/**
 * Secrets Management
 * 
 * Securely loads secrets from environment variables with validation and encryption support.
 * Supports dotenv-vault for production secret management.
 */

import { z } from 'zod';
import { logger } from './logger.js';

/**
 * Secret schema for validation
 */
const secretsSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Telegram
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  
  // API Keys
  BOT_API_SECRET: z.string().min(32, 'BOT_API_SECRET must be at least 32 characters'),
  API_SECRET_KEY: z.string().min(32).optional(),
  
  // Redis
  REDIS_URL: z.string().url().optional(),
  
  // Sentry
  SENTRY_DSN: z.string().url().optional(),
  
  // App
  APP_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('5000'),
  
  // Session
  SESSION_SECRET: z.string().min(32).optional(),
  
  // Audit
  AUDIT_LOG_SECRET: z.string().optional(),
  
  // Test (optional)
  TEST_DATABASE_URL: z.string().url().optional(),
  TEST_SECRET: z.string().optional(),
  CODECOV_TOKEN: z.string().optional(),
});

export type Secrets = z.infer<typeof secretsSchema>;

let cachedSecrets: Secrets | null = null;

/**
 * Load and validate secrets
 */
export function loadSecrets(): Secrets {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    // Parse and validate environment variables
    const secrets = secretsSchema.parse(process.env);
    
    // Cache for subsequent calls
    cachedSecrets = secrets;
    
    logger.info('Secrets loaded and validated successfully');
    
    return secrets;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingSecrets = error.errors.map(e => e.path.join('.')).join(', ');
      logger.error('Missing or invalid secrets', { missing: missingSecrets });
      
      throw new Error(
        `Missing or invalid environment variables: ${missingSecrets}\n` +
        'Please check your .env file or environment configuration.'
      );
    }
    
    throw error;
  }
}

/**
 * Get specific secret
 */
export function getSecret<K extends keyof Secrets>(key: K): Secrets[K] {
  const secrets = loadSecrets();
  return secrets[key];
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
  return getSecret('NODE_ENV') === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
  return getSecret('NODE_ENV') === 'development';
}

/**
 * Check if running in test
 */
export function isTest(): boolean {
  return getSecret('NODE_ENV') === 'test';
}

/**
 * Rotate secret (for testing/development)
 * In production, use AWS Secrets Manager or similar
 */
export async function rotateSecret(secretName: keyof Secrets, newValue: string): Promise<void> {
  if (isProduction()) {
    throw new Error('Secret rotation must be done through AWS Secrets Manager in production');
  }
  
  logger.warn('Rotating secret (development only)', { secretName });
  
  // In development, update process.env
  process.env[secretName] = newValue;
  
  // Clear cache
  cachedSecrets = null;
  
  // Reload secrets
  loadSecrets();
}

/**
 * Mask sensitive data for logging
 */
export function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) {
    return '****';
  }
  
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

/**
 * Validate secrets on startup
 */
export function validateSecretsOnStartup(): void {
  try {
    const secrets = loadSecrets();
    
    // Check critical secrets
    const criticalSecrets: (keyof Secrets)[] = [
      'DATABASE_URL',
      'TELEGRAM_BOT_TOKEN',
      'BOT_API_SECRET',
    ];
    
    const missing = criticalSecrets.filter(key => !secrets[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing critical secrets: ${missing.join(', ')}`);
    }
    
    // Validate secret strength
    const botSecret = secrets.BOT_API_SECRET;
    if (botSecret.length < 32) {
      logger.warn('BOT_API_SECRET is too short. Recommended: 32+ characters');
    }
    
    // Check for default/weak secrets in production
    if (isProduction()) {
      const weakSecrets = [
        'test',
        'password',
        'secret',
        '12345',
        'changeme',
      ];
      
      const hasWeakSecret = weakSecrets.some(weak => 
        botSecret.toLowerCase().includes(weak)
      );
      
      if (hasWeakSecret) {
        throw new Error('Weak or default secret detected in production!');
      }
    }
    
    logger.info('All secrets validated successfully', {
      environment: secrets.NODE_ENV,
      hasRedis: !!secrets.REDIS_URL,
      hasSentry: !!secrets.SENTRY_DSN,
      hasSupabase: !!secrets.SUPABASE_URL,
    });
  } catch (error) {
    logger.error('Secret validation failed', error);
    throw error;
  }
}

/**
 * Get redacted secrets for debugging
 */
export function getRedactedSecrets(): Record<string, string> {
  const secrets = loadSecrets();
  const redacted: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(secrets)) {
    if (typeof value === 'string' && value.length > 0) {
      redacted[key] = maskSecret(value);
    } else {
      redacted[key] = value?.toString() || 'not set';
    }
  }
  
  return redacted;
}

// Auto-validate on import in production
if (isProduction()) {
  validateSecretsOnStartup();
}
