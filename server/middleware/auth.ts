import { Request, Response, NextFunction } from "express";
import { supabaseAdmin } from "../lib/supabase.js";
import { storage } from "../storage.js";
import { logger } from "../lib/logger.js";

// Extend Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        companyId: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware to verify Supabase JWT and extract user info
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Missing or invalid authorization header" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      logger.warn("Invalid auth token", { error: error?.message });
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Extract user metadata
    const companyId = user.user_metadata?.company_id;
    const role = user.user_metadata?.role || 'admin';

    if (!companyId) {
      logger.error("User missing company_id in metadata", undefined, { userId: user.id });
      return res.status(403).json({ error: "User not associated with a company" });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email!,
      companyId,
      role
    };

    next();
  } catch (error) {
    logger.error("Error in auth middleware", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

/**
 * Middleware to verify user has access to specific company
 */
export function requireCompanyAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const companyId = req.params.companyId || req.body.company_id;

  if (!companyId) {
    return res.status(400).json({ error: "Company ID not provided" });
  }

  if (req.user.companyId !== companyId) {
    return res.status(403).json({ error: "Access denied to this company" });
  }

  next();
}

/**
 * Middleware to get employee from Telegram ID
 */
export async function requireTelegramEmployee(req: Request, res: Response, next: NextFunction) {
  try {
    const telegramId = req.params.telegramUserId || req.body.telegramId;

    if (!telegramId) {
      return res.status(400).json({ error: "Telegram ID not provided" });
    }

    const employee = await storage.getEmployeeByTelegramId(telegramId);

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Attach employee to request
    (req as any).employee = employee;

    next();
  } catch (error) {
    logger.error("Error in requireTelegramEmployee middleware", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

