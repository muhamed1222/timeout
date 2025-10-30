import { Express } from "express";
import { createServer, Server } from "http";
import authRouter from "./auth.js";
import companiesRouter from "./companies.js";
import employeesRouter from "./employees.js";
import invitesRouter from "./invites.js";
import violationRulesRouter from "./violation-rules.js";
import ratingRouter from "./rating.js";
import rateLimit from "express-rate-limit";
import violationsRouter from "./violations.js";

// Global API rate limiter
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per windowMs
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

export function registerRoutes(app: Express): Server {
  // Apply global rate limiter to all API routes
  app.use("/api", apiLimiter);
  
  // Register modular routers
  app.use("/api/auth", authRouter);
  app.use("/api/companies", companiesRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/employee-invites", invitesRouter);
  app.use("/api/violation-rules", violationRulesRouter);
  app.use("/api/rating", ratingRouter);
  app.use("/api/violations", violationsRouter);
  
  const httpServer = createServer(app);
  return httpServer;
}

