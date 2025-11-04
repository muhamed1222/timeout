import helmet from "helmet";
import type { Request, Response, NextFunction } from "express";

/**
 * Helmet Configuration for Security Headers
 * Provides protection against common web vulnerabilities
 */
export const helmetConfig = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // Required for some React dev tools, remove in production
        "https://telegram.org",
        "https://cdn.jsdelivr.net", // For CDN resources
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for styled components
        "https://fonts.googleapis.com",
      ],
      imgSrc: [
        "'self'",
        "data:",
        "https:",
        "blob:",
      ],
      connectSrc: [
        "'self'",
        process.env.SUPABASE_URL || "https://*.supabase.co",
        "wss:", // For WebSocket connections
        "https://api.telegram.org", // For Telegram API
      ],
      fontSrc: [
        "'self'",
        "data:",
        "https://fonts.gstatic.com",
      ],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: [
        "'self'",
        "https://telegram.org",
      ],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : null,
    },
  },

  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },

  // X-Frame-Options
  frameguard: {
    action: "sameorigin",
  },

  // X-Content-Type-Options
  noSniff: true,

  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false,
  },

  // X-Download-Options
  ieNoOpen: true,

  // Referrer-Policy
  referrerPolicy: {
    policy: "strict-origin-when-cross-origin",
  },

  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: "none",
  },

  // Hide X-Powered-By header
  hidePoweredBy: true,

  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disable if causing issues with external resources

  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: {
    policy: "same-origin-allow-popups",
  },

  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: {
    policy: "cross-origin",
  },

  // Origin-Agent-Cluster
  originAgentCluster: true,
});

/**
 * Additional security headers middleware
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  
  // XSS Protection (deprecated but still useful for old browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");
  
  // Permissions Policy (Feature Policy successor)
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=()",
  );
  
  // Clear site data on logout
  if (req.path === "/api/auth/logout" && req.method === "POST") {
    res.setHeader("Clear-Site-Data", '"cache", "cookies", "storage"');
  }
  
  next();
}

/**
 * CORS Configuration
 */
export const corsConfig = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      "http://localhost:5000",
      "http://localhost:3000",
      "https://telegram.org",
    ].filter(Boolean);

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Bot-Secret"],
  exposedHeaders: ["X-Total-Count", "X-Page-Count"],
  maxAge: 86400, // 24 hours
};







