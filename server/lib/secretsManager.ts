/**
 * AWS Secrets Manager Integration
 * 
 * Loads secrets from AWS Secrets Manager in production.
 * Falls back to environment variables in development.
 */

import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { logger } from "./logger.js";
import type { Secrets } from "./secrets.js";

let secretsManagerClient: SecretsManagerClient | null = null;
let cachedAWSSecrets: Secrets | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize AWS Secrets Manager client
 */
export function initSecretsManager(region?: string): SecretsManagerClient {
  if (secretsManagerClient) {
    return secretsManagerClient;
  }

  const awsRegion = region || process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
  
  secretsManagerClient = new SecretsManagerClient({
    region: awsRegion,
    // Credentials are automatically loaded from:
    // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
    // 2. AWS credentials file (~/.aws/credentials)
    // 3. IAM role (when running on EC2/ECS/Lambda)
  });

  logger.info("AWS Secrets Manager client initialized", { region: awsRegion });
  
  return secretsManagerClient;
}

/**
 * Load secrets from AWS Secrets Manager
 */
export async function loadSecretsFromAWS(
  secretName?: string,
): Promise<Record<string, string>> {
  const secretId = secretName || 
    process.env.AWS_SECRETS_MANAGER_SECRET_NAME || 
    "shiftmanager/production";

  // Check cache
  const now = Date.now();
  if (cachedAWSSecrets && (now - lastFetchTime) < CACHE_TTL) {
    logger.debug("Using cached AWS secrets");
    // Convert Secrets to Record<string, string> for AWS compatibility
    const stringSecrets: Record<string, string> = {};
    for (const [key, value] of Object.entries(cachedAWSSecrets)) {
      if (value !== undefined) {
        stringSecrets[key] = String(value);
      }
    }
    return stringSecrets;
  }

  try {
    const client = initSecretsManager();
    
    logger.info("Fetching secrets from AWS Secrets Manager", { secretId });
    
    const command = new GetSecretValueCommand({
      SecretId: secretId,
      // VersionStage: 'AWSCURRENT' (default) - gets the current version
    });

    const response = await client.send(command);
    
    if (!response.SecretString) {
      throw new Error("Secret string is empty");
    }

    const secrets = JSON.parse(response.SecretString) as Record<string, string>;
    
    // Cache the secrets
    cachedAWSSecrets = secrets as unknown as Secrets;
    lastFetchTime = now;
    
    logger.info("Successfully loaded secrets from AWS Secrets Manager", {
      secretId,
      secretCount: Object.keys(secrets).length,
    });
    
    return secrets;
  } catch (error) {
    logger.error("Failed to load secrets from AWS Secrets Manager", {
      error,
      secretId,
    });
    
    // In production, this is critical - throw error
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        `Failed to load secrets from AWS Secrets Manager: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
    
    // In development/test, fall back to environment variables
    logger.warn("Falling back to environment variables");
    return {};
  }
}

/**
 * Check if AWS Secrets Manager is configured
 */
export function isAWSSecretsManagerEnabled(): boolean {
  return !!(
    process.env.AWS_SECRETS_MANAGER_SECRET_NAME ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION
  );
}

/**
 * Clear cache (useful for testing or after rotation)
 */
export function clearSecretsCache(): void {
  cachedAWSSecrets = null;
  lastFetchTime = 0;
  logger.info("Secrets cache cleared");
}

/**
 * Rotate secret in AWS Secrets Manager
 * Note: This requires proper IAM permissions and should typically be done
 * through AWS Console or automated rotation Lambda function
 */
export async function rotateSecretInAWS(
  secretName: string,
  newSecretValue: Record<string, string>,
): Promise<void> {
  const { SecretsManagerClient, PutSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
  
  const client = initSecretsManager();
  
  logger.info("Rotating secret in AWS Secrets Manager", { secretName });
  
  try {
    const command = new PutSecretValueCommand({
      SecretId: secretName,
      SecretString: JSON.stringify(newSecretValue),
    });
    
    await client.send(command);
    
    // Clear cache to force reload
    clearSecretsCache();
    
    logger.info("Secret rotated successfully", { secretName });
  } catch (error) {
    logger.error("Failed to rotate secret", { error, secretName });
    throw error;
  }
}

