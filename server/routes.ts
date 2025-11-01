import type { Express } from "express";
import { createServer, type Server } from "http";
import { repositories } from "./repositories/index.js";
import rateLimit from "express-rate-limit";
import { logger } from "./lib/logger.js";
import { metricsMiddleware, startMetricsUpdater } from "./lib/metrics.js";

// Import modular routers
import authRouter from "./routes/auth.js";
import companiesRouter from "./routes/companies.js";
import companiesExtendedRouter from "./routes/companies-extended.js";
import employeesRouter from "./routes/employees.js";
import employeesExtendedRouter from "./routes/employees-extended.js";
import invitesRouter from "./routes/invites.js";
import schedulesRouter from "./routes/schedules.js";
import schedulesExtendedRouter from "./routes/schedules-extended.js";
import shiftsRouter from "./routes/shifts.js";
import ratingRouter from "./routes/rating.js";
import webappRouter from "./routes/webapp.js";
import violationRulesRouter from "./routes/violation-rules.js";
import violationsRouter from "./routes/violations.js";

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});


// Функция для автоматической очистки приглашений
async function startInviteCleanup() {
  setInterval(async () => {
    try {
      const deletedCount = await repositories.invite.cleanupExpired();
      if (deletedCount > 0) {
        logger.info(`Cleaned up ${deletedCount} expired invites`);
      }
    } catch (error) {
      logger.error('Error during invite cleanup', error);
    }
  }, 30 * 1000); // Каждые 30 секунд
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply Prometheus metrics middleware (before rate limiter to track all requests)
  app.use("/api", metricsMiddleware);
  
  // Apply global rate limiter to all API routes
  app.use("/api", apiLimiter);
  
  // Register modular routers
  app.use("/api/auth", authRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/companies", companiesExtendedRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/employees", employeesExtendedRouter);
  app.use("/api/employee-invites", invitesRouter);
  app.use("/api/schedule-templates", schedulesRouter);
  app.use("/api", schedulesExtendedRouter);
  app.use("/api/shifts", shiftsRouter);
  app.use("/api/rating", ratingRouter);
  app.use("/api/webapp", webappRouter);
  app.use("/api/violation-rules", violationRulesRouter);
  app.use("/api/violations", violationsRouter);

  const httpServer = createServer(app);

  // Start invite cleanup
  startInviteCleanup();
  
  // Start Prometheus metrics updater
  startMetricsUpdater(60000); // Update every minute

  return httpServer;
}
