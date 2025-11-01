/**
 * Secrets Management
 * 
 * Securely loads secrets from environment variables with validation and encryption support.
 * Supports AWS Secrets Manager for production secret management.
 */

import { z } from 'zod';
import { logger } from './logger.js';
import { 
  loadSecretsFromAWS, 
  isAWSSecretsManagerEnabled,
  clearSecretsCache 
} from './secretsManager.js';

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
 * In production with AWS Secrets Manager enabled, loads from AWS first
 */
export async function loadSecretsAsync(): Promise<Secrets> {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  try {
    // In production, try AWS Secrets Manager first
    if (process.env.NODE_ENV === 'production' && isAWSSecretsManagerEnabled()) {
      try {
        logger.info('Loading secrets from AWS Secrets Manager');
        const awsSecrets = await loadSecretsFromAWS();
        
        // Merge AWS secrets into process.env for backward compatibility
        Object.assign(process.env, awsSecrets);
      } catch (error) {
        logger.error('Failed to load from AWS Secrets Manager, falling back to env vars', { error });
        // Fall through to environment variables
      }
    }

    // In test environment, provide sensible defaults to avoid hard .env deps
    const isTestEnv = process.env.NODE_ENV === 'test';
    const envSource: NodeJS.ProcessEnv = { ...process.env };

    if (isTestEnv) {
      envSource.DATABASE_URL ||= 'http://localhost:5432/test-db';
      envSource.TELEGRAM_BOT_TOKEN ||= 'test-telegram-bot-token';
      envSource.BOT_API_SECRET ||= '0123456789abcdef0123456789abcdef';
      envSource.NODE_ENV = 'test';
    }

    // Parse and validate environment variables
    const secrets = secretsSchema.parse(envSource);
    
    // Cache for subsequent calls
    cachedSecrets = secrets;
    
    logger.info('Secrets loaded and validated successfully', {
      source: isProduction() && isAWSSecretsManagerEnabled() ? 'AWS Secrets Manager' : 'Environment Variables',
    });
    
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
 * Synchronous version (for backward compatibility)
 * In production, ensure loadSecretsAsync() is called at startup
 */
export function loadSecrets(): Secrets {
  if (cachedSecrets) {
    return cachedSecrets;
  }

  // If in production and AWS is enabled, this should not be called directly
  // (use loadSecretsAsync instead at startup)
  if (process.env.NODE_ENV === 'production' && isAWSSecretsManagerEnabled() && !cachedSecrets) {
    logger.warn('loadSecrets() called synchronously in production with AWS enabled. Use loadSecretsAsync() at startup.');
  }

  try {
    // In test environment, provide sensible defaults
    const isTestEnv = process.env.NODE_ENV === 'test';
    const envSource: NodeJS.ProcessEnv = { ...process.env };

    if (isTestEnv) {
      envSource.DATABASE_URL ||= 'http://localhost:5432/test-db';
      envSource.TELEGRAM_BOT_TOKEN ||= 'test-telegram-bot-token';
      envSource.BOT_API_SECRET ||= '0123456789abcdef0123456789abcdef';
      envSource.NODE_ENV = 'test';
    }

    // Parse and validate environment variables
    const secrets = secretsSchema.parse(envSource);
    
    // Cache for subsequent calls
    cachedSecrets = secrets;
    
    logger.info('Secrets loaded and validated successfully (sync)');
    
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
    if (isAWSSecretsManagerEnabled()) {
      // Use AWS Secrets Manager rotation
      const { rotateSecretInAWS } = await import('./secretsManager.js');
      const secretId = process.env.AWS_SECRETS_MANAGER_SECRET_NAME || 'shiftmanager/production';
      
      // Get current secrets
      const currentSecrets = await loadSecretsAsync();
      const updatedSecrets = { ...currentSecrets, [secretName]: newValue };
      
      // Convert to Record<string, string> for AWS
      const stringSecrets: Record<string, string> = {};
      for (const [key, value] of Object.entries(updatedSecrets)) {
        if (value !== undefined) {
          stringSecrets[key] = String(value);
        }
      }
      
      await rotateSecretInAWS(secretId, stringSecrets);
      
      // Clear cache to force reload
      cachedSecrets = null;
      clearSecretsCache();
      
      logger.info('Secret rotated in AWS Secrets Manager', { secretName });
      return;
    }
    
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
