/**
 * Server-side XSS Sanitization Utilities
 * 
 * Provides functions to sanitize user input before storing in database
 */

/**
 * Sanitize text by escaping HTML special characters
 */
export function sanitizeText(text: string): string {
  if (typeof text !== "string") {
    return "";
  }
  
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize user input by removing potentially dangerous content
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  
  let sanitized = input.trim();
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");
  
  // Remove data: protocol
  sanitized = sanitized.replace(/data:/gi, "");
  
  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== "string") {
    return "";
  }
  
  const trimmed = url.trim().toLowerCase();
  
  if (
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("vbscript:") ||
    trimmed.startsWith("file:")
  ) {
    return "";
  }
  
  return url;
}

/**
 * Sanitize SQL input (basic protection - always use parameterized queries!)
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  
  return input
    .replace(/['";]/g, "")
    .replace(/--/g, "")
    .replace(/\/\*/g, "")
    .replace(/\*\//g, "")
    .trim();
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") {
    return "";
  }
  
  return filename
    .replace(/[\/\\]/g, "")
    .replace(/\.\./g, "")
    .replace(/[<>:"|?*]/g, "")
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === "string") {
      sanitized[key] = sanitizeUserInput(value) as T[typeof key];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: unknown) =>
        typeof item === "string" ? sanitizeUserInput(item) : item,
      ) as T[typeof key];
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sanitized[key] = sanitizeObject(value as Record<string, unknown>) as any;
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Check if string contains XSS patterns
 */
export function containsXss(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<link/i,
    /<style/i,
    /expression\s*\(/i,
    /vbscript:/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Check if string contains SQL injection patterns
 * Note: This is a basic check. Always use parameterized queries!
 */
export function containsSqlInjection(input: string): boolean {
  if (typeof input !== "string") {
    return false;
  }
  
  // First check if it's likely HTML/XSS - if so, don't treat as SQL injection
  // This prevents false positives like <script> being caught as SQL injection
  // Check for HTML tags (including escaped versions in JSON strings)
  if (/<[a-z][\s\S]*>/i.test(input) || 
      /&lt;[a-z]/i.test(input) ||
      /\\u003c[a-z]/i.test(input) ||
      (/script/i.test(input) && /<|&lt;/i.test(input))) {
    // Likely HTML/XSS, not SQL injection - let XSS sanitization handle it
    return false;
  }
  
  const sqlPatterns = [
    // Removed SCRIPT from here to avoid false positives with <script> tags
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION)\b)/i,
    /(;)\s*(DROP|DELETE|INSERT|UPDATE|CREATE|ALTER)/i,
    /(\bOR\b\s*\d+\s*=\s*\d+)/i,
    /(\bAND\b\s*\d+\s*=\s*\d+)/i,
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\b1\s*=\s*1\b)/i,
    /(\b1\s*=\s*'1'\b)/i,
    // SQL comment patterns (but not if it's inside HTML tags)
    /(--[^\n]*)/i,
    /(\/\*[\s\S]*\*\/)/i,
  ];
  
  // Only check SQL patterns if not HTML/XSS
  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize string for use in SQL LIKE queries
 * Escapes special LIKE characters and removes dangerous patterns
 */
export function sanitizeForLike(query: string): string {
  if (typeof query !== "string") {
    return "";
  }
  
  // Remove SQL injection patterns
  if (containsSqlInjection(query)) {
    throw new Error("Potentially dangerous SQL pattern detected");
  }
  
  // Escape LIKE special characters
  return query
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .trim();
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") {
    return "";
  }
  
  // Basic email validation and sanitization
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmed)) {
    return "";
  }
  
  return trimmed;
}

/**
 * Sanitize phone number (removes non-numeric characters except +)
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== "string") {
    return "";
  }
  
  // Keep only digits, +, spaces, and hyphens
  return phone.replace(/[^\d+\-\s]/g, "").trim();
}

/**
 * Sanitize UUID (ensures valid UUID format)
 */
export function sanitizeUuid(uuid: string): string {
  if (typeof uuid !== "string") {
    return "";
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const trimmed = uuid.trim();
  
  if (!uuidRegex.test(trimmed)) {
    return "";
  }
  
  return trimmed.toLowerCase();
}

/**
 * Deep sanitize object - recursively sanitizes all string values
 * Handles nested objects and arrays
 */
export function deepSanitize<T>(input: T, options?: {
  sanitizeNumbers?: boolean;
  sanitizeDates?: boolean;
  maxDepth?: number;
}): T {
  const maxDepth = options?.maxDepth ?? 10;
  
  function sanitizeRecursive(value: unknown, depth: number): unknown {
    if (depth > maxDepth) {
      return value; // Prevent stack overflow
    }
    
    // Preserve Date objects
    if (value instanceof Date) {
      return value;
    }
    
    // Preserve null and undefined
    if (value === null || value === undefined) {
      return value;
    }
    
    if (typeof value === "string") {
      // Check for dangerous patterns
      if (containsSqlInjection(value)) {
        throw new Error("Potentially dangerous SQL pattern detected in input");
      }
      if (containsXss(value)) {
        // Sanitize but don't throw - XSS might be intentional in some contexts
        return sanitizeUserInput(value);
      }
      return sanitizeUserInput(value);
    }
    
    if (Array.isArray(value)) {
      return value.map(item => sanitizeRecursive(item, depth + 1));
    }
    
    if (value && typeof value === "object") {
      // Check if it's a special object type that should be preserved
      if (value instanceof RegExp || value instanceof Error || value instanceof Map || value instanceof Set) {
        return value;
      }
      
      const sanitized: Record<string, unknown> = {};
      for (const key in value) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          // Sanitize object keys too
          const sanitizedKey = sanitizeUserInput(key);
          sanitized[sanitizedKey] = sanitizeRecursive((value as Record<string, unknown>)[key], depth + 1);
        }
      }
      return sanitized;
    }
    
    return value;
  }
  
  return sanitizeRecursive(input, 0) as T;
}

