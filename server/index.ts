// Initialize Sentry FIRST, before any other imports
import { initSentry, Sentry } from "./lib/sentry.js";
initSentry();

import express from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { scheduler } from "./services/scheduler.js";
import { configureCors } from "./lib/cors.js";
import { errorHandler, notFoundHandler } from "./lib/errorHandler.js";
import { sanitizeInput } from "./middleware/sanitize.js";
import { setupSwagger } from "./swagger.js";
import { loadSecretsAsync, validateSecretsOnStartup, isProduction, getSecret } from "./lib/secrets.js";

// Launch Telegram bot in development mode
import "./launchBot.js";

const app = express();

// Respect proxy headers (needed for correct https detection on Vercel/behind proxies)
app.set("trust proxy", true);

// CORS must be configured before other middleware
app.use(configureCors());

// Parse JSON and URL-encoded bodies
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Input sanitization middleware - must be after body parsing but before routes
app.use(sanitizeInput);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Load secrets from AWS Secrets Manager in production (before everything else)
  try {
    if (isProduction()) {
      await loadSecretsAsync();
    }
    await validateSecretsOnStartup();
  } catch (error) {
    log(`Failed to load secrets: ${error instanceof Error ? error.message : "Unknown error"}`);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  // Setup Swagger/OpenAPI documentation (enable in development or with ENABLE_DOCS=true)
  if (!isProduction() || process.env.ENABLE_DOCS === "true") {
    setupSwagger(app);
  }

  // Sentry error handler (must be before other error handlers)
  // @ts-ignore - Sentry types issue
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/prefer-nullish-coalescing
  app.use(Sentry.Handlers?.errorHandler?.() || ((_req: any, _res: any, next: any) => next()));

  // Standardized error handling (must be after all routes)
  app.use(notFoundHandler);
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = getSecret("PORT");
  server.listen({
    port,
    host: "127.0.0.1",
  }, () => {
    log(`serving on port ${port}`);
    
    // Start scheduled tasks (monitoring, reminders)
    // Skip scheduler on Vercel - use Vercel Cron Jobs instead
    if (!process.env.VERCEL) {
      scheduler.startAll();
      log("Schedulers started");
    } else {
      log("Running on Vercel - schedulers disabled (use Vercel Cron Jobs)");
    }
  });

  // Graceful shutdown
  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down gracefully...");
    scheduler.stopAll();
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });

  process.on("SIGINT", () => {
    log("SIGINT received, shutting down gracefully...");
    scheduler.stopAll();
    server.close(() => {
      log("Server closed");
      process.exit(0);
    });
  });
})();
