import { randomBytes } from "crypto";
import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      sessionID?: string;
    }
  }
}

/**
 * CSRF Token Store
 * In production, use Redis or database instead of in-memory Map
 */
const csrfTokens = new Map<string, { token: string; createdAt: number }>();

// Clean up expired tokens every hour
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

setInterval(() => {
  const now = Date.now();
  const entries = Array.from(csrfTokens.entries());
  for (const [sessionId, data] of entries) {
    if (now - data.createdAt > TOKEN_EXPIRY) {
      csrfTokens.delete(sessionId);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Generate CSRF token for a session
 */
export function generateCsrfToken(req: Request): string {
  const token = randomBytes(32).toString("hex");
  const sessionId = req.sessionID || req.ip || "unknown";
  
  csrfTokens.set(sessionId, {
    token,
    createdAt: Date.now(),
  });
  
  logger.debug("CSRF token generated", { sessionId });
  return token;
}

/**
 * Verify CSRF token
 */
function verifyCsrfToken(req: Request, providedToken: string): boolean {
  const sessionId = req.sessionID || req.ip || "unknown";
  const stored = csrfTokens.get(sessionId);
  
  if (!stored) {
    logger.warn("CSRF token not found for session", { sessionId });
    return false;
  }
  
  // Check expiry
  if (Date.now() - stored.createdAt > TOKEN_EXPIRY) {
    csrfTokens.delete(sessionId);
    logger.warn("CSRF token expired", { sessionId });
    return false;
  }
  
  // Verify token
  const isValid = stored.token === providedToken;
  
  if (!isValid) {
    logger.warn("CSRF token mismatch", { sessionId });
  }
  
  return isValid;
}

/**
 * CSRF Protection Middleware
 * Skip for safe methods (GET, HEAD, OPTIONS) and bot API (has X-Bot-Secret)
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip GET, HEAD, OPTIONS (safe methods)
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  
  // Skip bot API routes (protected by X-Bot-Secret)
  if (req.headers["x-bot-secret"]) {
    return next();
  }
  
  // Skip public routes
  const publicPaths = ["/api/auth/login", "/api/auth/register"];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  // Get token from header
  const providedToken = req.headers["x-csrf-token"] as string;
  
  if (!providedToken) {
    logger.warn("CSRF token missing in request", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    res.status(403).json({ error: "CSRF token missing" });
    return;
  }
  
  // Verify token
  if (!verifyCsrfToken(req, providedToken)) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }
  
  next();
}

/**
 * Clear CSRF token for a session
 */
export function clearCsrfToken(sessionId: string): void {
  csrfTokens.delete(sessionId);
}

