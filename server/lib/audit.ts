/**
 * Audit logging system
 * Tracks all important actions for security and compliance
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";
import { repositories } from "../repositories/index.js";

export type AuditAction = 
  // Auth actions
  | "auth.login"
  | "auth.logout"
  | "auth.register"
  | "auth.password_reset"
  
  // Company actions
  | "company.create"
  | "company.update"
  | "company.delete"
  
  // Employee actions
  | "employee.create"
  | "employee.update"
  | "employee.delete"
  | "employee.telegram_link"
  | "employee.telegram_unlink"
  
  // Shift actions
  | "shift.create"
  | "shift.update"
  | "shift.start"
  | "shift.end"
  | "shift.cancel"
  
  // Break actions
  | "break.start"
  | "break.end"
  
  // Violation actions
  | "violation.create"
  | "violation.update"
  | "violation.delete"
  
  // Exception actions
  | "exception.create"
  | "exception.resolve"
  | "exception.reject"
  
  // Settings actions
  | "settings.update"
  | "violation_rule.create"
  | "violation_rule.update"
  | "violation_rule.delete";

export interface AuditLogEntry {
  action: AuditAction;
  actor_id?: string;
  actor_type: "user" | "employee" | "system" | "bot";
  actor_ip?: string;
  company_id?: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  result: "success" | "failure";
  error_message?: string;
  timestamp: Date;
  user_agent?: string;
}

class AuditLogger {
  /**
   * Log an audit event
   */
  async log(entry: Omit<AuditLogEntry, "timestamp">): Promise<void> {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
    };
    
    // Log to Winston logger (fallback)
    logger.info("AUDIT", logEntry);
    
    // Write to database audit log table
    try {
      // Format actor as "actor_type:actor_id" or just "actor_type" if no ID
      const actor = entry.actor_id 
        ? `${entry.actor_type}:${entry.actor_id}`
        : entry.actor_type;
      
      // Format entity as "resource_type:resource_id" or just "resource_type"
      const entity = entry.resource_id
        ? `${entry.resource_type || "unknown"}:${entry.resource_id}`
        : entry.resource_type || "system";
      
      // Include all additional details in payload
      const payload: Record<string, unknown> = {
        ...entry.details,
        actor_type: entry.actor_type,
        actor_ip: entry.actor_ip,
        company_id: entry.company_id,
        result: entry.result,
      };
      
      if (entry.error_message) {
        payload.error_message = entry.error_message;
      }
      
      if (entry.user_agent) {
        payload.user_agent = entry.user_agent;
      }
      
      // Write to database
      await repositories.audit.log(actor, entry.action, entity, payload);
    } catch (error) {
      // If database write fails, log error but don't fail the request
      logger.error("Failed to write audit log to database", error, {
        action: entry.action,
        actor_type: entry.actor_type,
        actor_id: entry.actor_id,
      });
      // Winston logging above will still work as fallback
    }
  }
  
  /**
   * Log authentication event
   */
  async logAuth(params: {
    action: Extract<AuditAction, `auth.${string}`>;
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    result: "success" | "failure";
    error?: string;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actor_id: params.userId,
      actor_type: "user",
      actor_ip: params.ip,
      details: { email: params.email },
      result: params.result,
      error_message: params.error,
      user_agent: params.userAgent,
    });
  }
  
  /**
   * Log resource change
   */
  async logResourceChange(params: {
    action: AuditAction;
    actorId?: string;
    actorType: "user" | "employee" | "system" | "bot";
    companyId?: string;
    resourceType: string;
    resourceId: string;
    changes?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actor_id: params.actorId,
      actor_type: params.actorType,
      actor_ip: params.ip,
      company_id: params.companyId,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      details: params.changes,
      result: "success",
      user_agent: params.userAgent,
    });
  }
  
  /**
   * Log failed operation
   */
  async logFailure(params: {
    action: AuditAction;
    actorId?: string;
    actorType: "user" | "employee" | "system" | "bot";
    error: string;
    details?: Record<string, unknown>;
    ip?: string;
  }): Promise<void> {
    await this.log({
      action: params.action,
      actor_id: params.actorId,
      actor_type: params.actorType,
      actor_ip: params.ip,
      details: params.details,
      result: "failure",
      error_message: params.error,
    });
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();

/**
 * Middleware to automatically audit API requests
 */
export function auditMiddleware(options?: {
  /**
   * Actions to audit (if not specified, audits all)
   */
  actions?: AuditAction[];
  
  /**
   * Custom action resolver (derives action from request)
   */
  getAction?: (req: Request) => AuditAction | null;
  
  /**
   * Custom resource resolver
   */
  getResource?: (req: Request) => { type: string; id: string } | null;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip for GET requests (read-only)
    if (req.method === "GET") {
      return next();
    }
    
    // Capture original res.json to intercept response
    const originalJson = res.json.bind(res);
    let responseBody: unknown;
    
    res.json = function (body: unknown) {
      responseBody = body;
      return originalJson(body);
    };
    
    // Capture response finish event
    res.on("finish", async () => {
      try {
        // Only audit successful operations (2xx status codes)
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return;
        }
        
        // Get action from options or derive from route
        let action: AuditAction | null = null;
        
        if (options?.getAction) {
          action = options.getAction(req);
        } else {
          action = deriveActionFromRoute(req);
        }
        
        if (!action) {
          return;
        }
        
        // Check if this action should be audited
        if (options?.actions && !options.actions.includes(action)) {
          return;
        }
        
        // Get resource info
        let resource: { type: string; id: string } | null = null;
        
        if (options?.getResource) {
          resource = options.getResource(req);
        } else {
          resource = deriveResourceFromRoute(req);
        }
        
        // Get actor info (from auth middleware)
        const actorId = (req as any).user?.id || (req as any).employee?.id;
        const actorType = (req as any).user ? "user" : (req as any).employee ? "employee" : "system";
        const companyId = (req as any).user?.company_id || (req as any).employee?.company_id;
        
        // Log the audit event
        await auditLogger.log({
          action,
          actor_id: actorId,
          actor_type: actorType,
          actor_ip: req.ip || req.headers["x-forwarded-for"] as string,
          company_id: companyId,
          resource_type: resource?.type,
          resource_id: resource?.id,
          details: {
            method: req.method,
            path: req.path,
            body: req.body,
            response: responseBody,
          },
          result: "success",
          user_agent: req.headers["user-agent"],
        });
      } catch (error) {
        logger.error("Error in audit middleware", error);
        // Don't fail the request if audit logging fails
      }
    });
    
    next();
  };
}

/**
 * Derive action from route and method
 */
function deriveActionFromRoute(req: Request): AuditAction | null {
  const { method, path } = req;
  
  // Auth routes
  if (path.includes("/auth/login")) {
    return "auth.login";
  }
  if (path.includes("/auth/logout")) {
    return "auth.logout";
  }
  if (path.includes("/auth/register")) {
    return "auth.register";
  }
  
  // Company routes
  if (path.includes("/companies")) {
    if (method === "POST") {
      return "company.create";
    }
    if (method === "PUT" || method === "PATCH") {
      return "company.update";
    }
    if (method === "DELETE") {
      return "company.delete";
    }
  }
  
  // Employee routes
  if (path.includes("/employees")) {
    if (method === "POST") {
      return "employee.create";
    }
    if (method === "PUT" || method === "PATCH") {
      return "employee.update";
    }
    if (method === "DELETE") {
      return "employee.delete";
    }
  }
  
  // Shift routes
  if (path.includes("/shifts")) {
    if (path.includes("/start")) {
      return "shift.start";
    }
    if (path.includes("/end")) {
      return "shift.end";
    }
    if (path.includes("/cancel")) {
      return "shift.cancel";
    }
    if (method === "POST") {
      return "shift.create";
    }
    if (method === "PUT" || method === "PATCH") {
      return "shift.update";
    }
  }
  
  // Break routes
  if (path.includes("/breaks")) {
    if (path.includes("/start")) {
      return "break.start";
    }
    if (path.includes("/end")) {
      return "break.end";
    }
  }
  
  // Violation routes
  if (path.includes("/violations")) {
    if (method === "POST") {
      return "violation.create";
    }
    if (method === "PUT" || method === "PATCH") {
      return "violation.update";
    }
    if (method === "DELETE") {
      return "violation.delete";
    }
  }
  
  // Exception routes
  if (path.includes("/exceptions")) {
    if (path.includes("/resolve")) {
      return "exception.resolve";
    }
    if (method === "POST") {
      return "exception.create";
    }
  }
  
  return null;
}

/**
 * Derive resource from route params
 */
function deriveResourceFromRoute(req: Request): { type: string; id: string } | null {
  const { path, params } = req;
  
  if (path.includes("/companies") && params.id) {
    return { type: "company", id: params.id };
  }
  
  if (path.includes("/employees") && params.id) {
    return { type: "employee", id: params.id };
  }
  
  if (path.includes("/shifts") && params.id) {
    return { type: "shift", id: params.id };
  }
  
  if (path.includes("/violations") && params.id) {
    return { type: "violation", id: params.id };
  }
  
  if (path.includes("/exceptions") && params.id) {
    return { type: "exception", id: params.id };
  }
  
  return null;
}

