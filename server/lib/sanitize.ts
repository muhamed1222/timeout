/**
 * Server-side XSS Sanitization Utilities
 * 
 * Provides functions to sanitize user input before storing in database
 */

/**
 * Sanitize text by escaping HTML special characters
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user input by removing potentially dangerous content
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  let sanitized = input.trim();
  
  // Remove script tags
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol
  sanitized = sanitized.replace(/data:/gi, '');
  
  return sanitized;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (typeof url !== 'string') return '';
  
  const trimmed = url.trim().toLowerCase();
  
  if (
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('vbscript:') ||
    trimmed.startsWith('file:')
  ) {
    return '';
  }
  
  return url;
}

/**
 * Sanitize SQL input (basic protection - always use parameterized queries!)
 */
export function sanitizeSqlInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/['";]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .trim();
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') return '';
  
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\.\./g, '')
    .replace(/[<>:"|?*]/g, '')
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeUserInput(value) as T[typeof key];
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item: unknown) =>
        typeof item === 'string' ? sanitizeUserInput(item) : item
      ) as T[typeof key];
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
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
  if (typeof input !== 'string') return false;
  
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
  ];
  
  return xssPatterns.some(pattern => pattern.test(input));
}

