import { z } from "zod";
import { logger } from "./logger.js";

/**
 * Environment variables schema
 * Validates all required environment variables at startup
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Supabase
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_ANON_KEY: z.string().min(1, "SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  
  // Telegram (optional)
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  
  // CORS configuration (optional)
  ALLOWED_ORIGINS: z.string().optional(),
  ALLOW_NO_ORIGIN: z.string().optional(),
  
  // S3 Backup (optional)
  S3_BACKUP_BUCKET: z.string().optional(),
  
  // Sentry (optional)
  SENTRY_DSN: z.string().url().optional(),
  
  // Server config
  PORT: z.string().default("5000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws error if validation fails
 */
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);
    logger.info("Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.error("Environment variable validation failed", error);
      // Use console.error for critical startup errors that need to be visible
      // eslint-disable-next-line no-console
      console.error("\n❌ Missing or invalid environment variables:");
      error.errors.forEach((err) => {
        // eslint-disable-next-line no-console
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      // eslint-disable-next-line no-console
      console.error("\nPlease check your .env.local file or environment configuration.\n");
    }
    process.exit(1);
  }
}

/**
 * Get validated environment variables
 */
export const env = validateEnv();

