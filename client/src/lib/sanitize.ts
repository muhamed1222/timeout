/**
 * XSS Sanitization Utilities
 * 
 * Provides functions to sanitize user input and prevent Cross-Site Scripting (XSS) attacks
 */

/**
 * Sanitize text by escaping HTML special characters
 * Use this for plain text that will be displayed in HTML
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
 * Sanitize HTML by allowing only safe tags
 * Use this when you need to allow some HTML formatting
 */
export function sanitizeHtml(html: string): string {
  if (typeof html !== "string") {
    return "";
  }
  
  // Remove script tags and their content
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, "");
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, "");
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:/gi, "");
  
  // Remove vbscript: protocol
  sanitized = sanitized.replace(/vbscript:/gi, "");
  
  return sanitized;
}

/**
 * Sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== "string") {
    return "";
  }
  
  const trimmed = url.trim().toLowerCase();
  
  // Block dangerous protocols
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
 * Sanitize form input data
 * Removes leading/trailing whitespace and escapes HTML
 */
export function sanitizeFormInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  
  return sanitizeText(input.trim());
}

/**
 * Sanitize object with string values
 * Useful for form data objects
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === "string") {
      sanitized[key] = sanitizeFormInput(value) as T[typeof key];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: unknown) =>
        typeof item === "string" ? sanitizeFormInput(item) : item,
      ) as T[typeof key];
    } else if (value && typeof value === "object") {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Strip all HTML tags from a string
 * Use this when you want only plain text
 */
export function stripHtmlTags(html: string): string {
  if (typeof html !== "string") {
    return "";
  }
  
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== "string") {
    return "";
  }
  
  const sanitized = email.trim().toLowerCase();
  
  // Basic email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    return "";
  }
  
  return sanitized;
}

/**
 * Sanitize filename to prevent directory traversal
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== "string") {
    return "";
  }
  
  return filename
    .replace(/[\/\\]/g, "") // Remove path separators
    .replace(/\.\./g, "")   // Remove parent directory references
    .replace(/[<>:"|?*]/g, "") // Remove invalid filename characters
    .trim();
}

/**
 * Sanitize SQL-like input (basic protection)
 * Note: This is NOT a replacement for parameterized queries!
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== "string") {
    return "";
  }
  
  return input
    .replace(/['";]/g, "") // Remove quotes and semicolons
    .replace(/--/g, "")    // Remove SQL comments
    .replace(/\/\*/g, "")  // Remove multi-line comment start
    .replace(/\*\//g, "")  // Remove multi-line comment end
    .trim();
}

/**
 * Create safe text content for React
 * This is a wrapper that makes it clear the content is sanitized
 */
export function createSafeText(text: string): string {
  return sanitizeText(text);
}

/**
 * Check if a string contains potential XSS patterns
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
    /eval\(/i,
    /expression\(/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

