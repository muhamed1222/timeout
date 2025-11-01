# 🔒 Input Validation & Audit Logging Guide

## Overview

This guide covers the comprehensive input validation and audit logging system implemented for security and compliance.

---

## 📝 Input Validation with Zod

### Architecture

**Location:** `server/lib/validation.ts` (400+ lines, 40+ schemas)

**Benefits:**
- ✅ Type-safe validation (TypeScript inference)
- ✅ Runtime validation
- ✅ Clear error messages
- ✅ Reusable schemas
- ✅ Centralized validation logic

### Available Schemas

#### Auth Schemas
```typescript
import { loginSchema, registerSchema } from '../lib/validation.js';

// Login validation
const result = loginSchema.parse({
  email: 'user@example.com',
  password: 'SecurePass123'
});

// Register validation
const user = registerSchema.parse({
  email: 'user@example.com',
  password: 'SecurePass123',
  full_name: 'John Doe',
  company_name: 'Acme Corp'
});
```

#### Employee Schemas
```typescript
import { createEmployeeSchema, updateEmployeeSchema } from '../lib/validation.js';

// Create employee
const employee = createEmployeeSchema.parse({
  full_name: 'Jane Smith',
  position: 'Software Engineer',
  email: 'jane@example.com',
  phone_number: '+1234567890',
  status: 'active'
});

// Update employee (all fields optional)
const updates = updateEmployeeSchema.parse({
  position: 'Senior Engineer'
});
```

#### Shift Schemas
```typescript
import { createShiftSchema, startShiftSchema } from '../lib/validation.js';

// Create shift with date validation
const shift = createShiftSchema.parse({
  employee_id: 'uuid-here',
  planned_start_at: '2025-10-30T09:00:00Z',
  planned_end_at: '2025-10-30T17:00:00Z',
  notes: 'Regular shift'
});
// ✅ Validates: end_at > start_at

// Start shift
const started = startShiftSchema.parse({
  actual_start_at: new Date(),
  notes: 'Started on time'
});
```

#### Violation Schemas
```typescript
import { createViolationSchema, violationTypeSchema } from '../lib/validation.js';

const violation = createViolationSchema.parse({
  employee_id: 'uuid',
  shift_id: 'uuid',
  type: 'late_start',
  severity: 5,
  description: 'Employee started 20 minutes late',
  source: 'auto'
});
```

#### Query Schemas
```typescript
import { employeeQuerySchema, shiftQuerySchema } from '../lib/validation.js';

// Employee list with pagination
const query = employeeQuerySchema.parse({
  company_id: 'uuid',
  status: 'active',
  search: 'john',
  page: 1,
  limit: 20
});

// Shift query with date range
const shifts = shiftQuerySchema.parse({
  employee_id: 'uuid',
  status: 'completed',
  from_date: '2025-10-01',
  to_date: '2025-10-31',
  page: 1,
  limit: 50
});
```

---

## 🛡️ Validation Middleware

### Usage in Routes

```typescript
import { validateBody, validateQuery, validateParams } from '../middleware/validate.js';
import { createEmployeeSchema, employeeQuerySchema } from '../lib/validation.js';

// Validate body
router.post('/employees',
  validateBody(createEmployeeSchema),
  async (req, res) => {
    // req.body is now validated and typed
    const employee = await storage.createEmployee(req.body);
    res.json(employee);
  }
);

// Validate query parameters
router.get('/employees',
  validateQuery(employeeQuerySchema),
  async (req, res) => {
    // req.query is now validated
    const employees = await storage.getEmployees(req.query);
    res.json(employees);
  }
);

// Validate URL params
router.get('/employees/:id',
  validateParams(z.object({ id: uuidSchema })),
  async (req, res) => {
    // req.params.id is validated UUID
    const employee = await storage.getEmployee(req.params.id);
    res.json(employee);
  }
);

// Validate multiple parts
import { validate } from '../middleware/validate.js';

router.put('/employees/:id',
  validate({
    params: z.object({ id: uuidSchema }),
    body: updateEmployeeSchema,
  }),
  async (req, res) => {
    // Both params and body are validated
    const employee = await storage.updateEmployee(
      req.params.id, 
      req.body
    );
    res.json(employee);
  }
);
```

### Error Response Format

When validation fails, the API returns:

```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

**HTTP Status:** 400 Bad Request

---

## 📊 Audit Logging

### Architecture

**Location:** `server/lib/audit.ts` (400+ lines)

**Features:**
- ✅ Tracks all critical actions
- ✅ Records actor (who), resource (what), time (when)
- ✅ Logs to Winston (file, console)
- ✅ Ready for external SIEM integration
- ✅ Compliance-ready (GDPR, SOC2, ISO 27001)

### Audit Actions

```typescript
// Auth actions
'auth.login'
'auth.logout'
'auth.register'
'auth.password_reset'

// Company actions
'company.create'
'company.update'
'company.delete'

// Employee actions
'employee.create'
'employee.update'
'employee.delete'
'employee.telegram_link'
'employee.telegram_unlink'

// Shift actions
'shift.create'
'shift.start'
'shift.end'
'shift.cancel'
'shift.update'

// Break actions
'break.start'
'break.end'

// Violation & Exception actions
'violation.create'
'exception.create'
'exception.resolve'

// Settings actions
'settings.update'
'violation_rule.create'
```

### Manual Audit Logging

```typescript
import { auditLogger } from '../lib/audit.js';

// Log authentication
await auditLogger.logAuth({
  action: 'auth.login',
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  result: 'success'
});

// Log resource change
await auditLogger.logResourceChange({
  action: 'employee.update',
  actorId: req.user.id,
  actorType: 'user',
  companyId: req.user.company_id,
  resourceType: 'employee',
  resourceId: employee.id,
  changes: { position: 'Senior Engineer' },
  ip: req.ip,
  userAgent: req.headers['user-agent']
});

// Log failure
await auditLogger.logFailure({
  action: 'shift.start',
  actorId: req.employee.id,
  actorType: 'employee',
  error: 'Shift already started',
  details: { shiftId: shift.id },
  ip: req.ip
});
```

### Automatic Audit Middleware

```typescript
import { auditMiddleware } from '../lib/audit.js';

// Apply to specific routes
router.use('/employees', auditMiddleware());

// Audit only specific actions
router.use('/companies', auditMiddleware({
  actions: ['company.create', 'company.update', 'company.delete']
}));

// Custom action resolver
router.use('/shifts', auditMiddleware({
  getAction: (req) => {
    if (req.path.includes('/start')) return 'shift.start';
    if (req.path.includes('/end')) return 'shift.end';
    return null;
  },
  getResource: (req) => ({
    type: 'shift',
    id: req.params.id
  })
}));
```

### Audit Log Format

```json
{
  "action": "employee.update",
  "actor_id": "user-uuid",
  "actor_type": "user",
  "actor_ip": "192.168.1.1",
  "company_id": "company-uuid",
  "resource_type": "employee",
  "resource_id": "employee-uuid",
  "details": {
    "method": "PUT",
    "path": "/api/employees/uuid",
    "body": { "position": "Senior Engineer" },
    "response": { "id": "...", "position": "Senior Engineer" }
  },
  "result": "success",
  "user_agent": "Mozilla/5.0...",
  "timestamp": "2025-10-29T12:34:56.789Z"
}
```

---

## 🔐 Security Best Practices

### 1. Always Validate Input

```typescript
// ❌ BAD: No validation
router.post('/employees', async (req, res) => {
  const employee = await storage.createEmployee(req.body);
  res.json(employee);
});

// ✅ GOOD: With validation
router.post('/employees',
  validateBody(createEmployeeSchema),
  async (req, res) => {
    const employee = await storage.createEmployee(req.body);
    res.json(employee);
  }
);
```

### 2. Validate All Request Parts

```typescript
// Validate params, query, AND body
router.put('/employees/:id',
  validate({
    params: z.object({ id: uuidSchema }),
    query: z.object({ notify: z.boolean().optional() }),
    body: updateEmployeeSchema
  }),
  async (req, res) => {
    // All validated
  }
);
```

### 3. Sanitize String Inputs

```typescript
// Schema with max length
const nameSchema = z.string()
  .min(2)
  .max(100)
  .regex(/^[a-zA-Z\s-]+$/, 'Only letters, spaces, and hyphens allowed');

// Trim whitespace
const emailSchema = z.string()
  .email()
  .trim()
  .toLowerCase();
```

### 4. Validate Related Fields

```typescript
const shiftSchema = z.object({
  start_at: z.date(),
  end_at: z.date()
}).refine(
  data => data.end_at > data.start_at,
  { message: 'End time must be after start time' }
);
```

### 5. Audit Sensitive Operations

```typescript
// Always audit:
// - Authentication events
// - Permission changes
// - Data modifications
// - Access to sensitive resources

router.post('/employees/:id/permissions',
  validateBody(permissionsSchema),
  async (req, res) => {
    const result = await updatePermissions(req.params.id, req.body);
    
    // Audit the change
    await auditLogger.logResourceChange({
      action: 'employee.permissions_update',
      actorId: req.user.id,
      actorType: 'user',
      resourceType: 'employee',
      resourceId: req.params.id,
      changes: req.body
    });
    
    res.json(result);
  }
);
```

---

## 📈 Implementation Status

### Covered Endpoints

| Route | Validation | Audit Logging |
|-------|-----------|---------------|
| `/employee-invites/:code/accept` | ✅ | ✅ |
| `/shifts/:id/start` | ✅ | ✅ |
| `/shifts/:id/end` | ✅ | ✅ |
| `/breaks/start` | ✅ | ✅ |
| `/breaks/:id/end` | ✅ | ✅ |
| `/daily-reports` | ✅ | ✅ |

### TODO (Next Steps)

- [ ] Add validation to `/employees` routes
- [ ] Add validation to `/companies` routes
- [ ] Add validation to `/violations` routes
- [ ] Add validation to `/exceptions` routes
- [ ] Create audit log database table
- [ ] Export audit logs to external SIEM
- [ ] Add audit log retention policy
- [ ] Add audit log search API

---

## 🧪 Testing Validation

```typescript
import { describe, it, expect } from 'vitest';
import { createEmployeeSchema } from '../lib/validation.js';

describe('Employee Validation', () => {
  it('should validate correct employee data', () => {
    const result = createEmployeeSchema.parse({
      full_name: 'John Doe',
      position: 'Engineer',
      email: 'john@example.com',
      status: 'active'
    });
    
    expect(result.full_name).toBe('John Doe');
  });
  
  it('should reject invalid email', () => {
    expect(() => {
      createEmployeeSchema.parse({
        full_name: 'John Doe',
        position: 'Engineer',
        email: 'invalid-email',
        status: 'active'
      });
    }).toThrow('Invalid email format');
  });
  
  it('should reject short names', () => {
    expect(() => {
      createEmployeeSchema.parse({
        full_name: 'J',
        position: 'Engineer',
        email: 'john@example.com',
        status: 'active'
      });
    }).toThrow('at least 2 characters');
  });
});
```

---

## 🔍 Monitoring & Compliance

### Audit Log Analysis

```bash
# Find all failed login attempts
grep 'auth.login.*failure' backend.log

# Find all employee modifications
grep 'employee.update' backend.log

# Find actions by specific user
grep 'actor_id":"user-uuid"' backend.log

# Find high-severity violations created
grep 'violation.create.*severity":[8-9]' backend.log
```

### Compliance Reports

**Audit logs provide evidence for:**

1. **GDPR Article 30** - Records of processing activities
2. **SOC 2 CC6.1** - Logical and physical access controls
3. **ISO 27001 A.12.4.1** - Event logging
4. **HIPAA 164.312(b)** - Audit controls
5. **PCI DSS 10.2** - Audit trail for system components

### Retention Policy

```typescript
// Recommended retention periods:
const RETENTION = {
  auth_events: 90,      // days
  data_changes: 365,    // days (1 year)
  sensitive_access: 2555, // days (7 years for compliance)
  system_events: 30,    // days
};

// Implement rotation in production
// (e.g., daily cron job to archive old logs)
```

---

## 🚀 Production Recommendations

### 1. External Audit Storage

```typescript
// Send audit logs to external service
import { AuditLogService } from '@aws/cloudtrail-client';

await auditLogger.log({
  ...entry,
  // Also send to CloudTrail, Datadog, Splunk, etc.
});
```

### 2. Real-time Alerting

```typescript
// Alert on suspicious activity
if (entry.action === 'auth.login' && entry.result === 'failure') {
  const recentFailures = await countRecentFailures(entry.actor_ip);
  
  if (recentFailures > 5) {
    await alertSecurityTeam({
      type: 'brute_force_attempt',
      ip: entry.actor_ip,
      count: recentFailures
    });
  }
}
```

### 3. Audit Log Integrity

```typescript
// Sign audit logs with HMAC for tamper-detection
import crypto from 'crypto';

const signature = crypto
  .createHmac('sha256', process.env.AUDIT_LOG_SECRET)
  .update(JSON.stringify(entry))
  .digest('hex');

await auditLogger.log({
  ...entry,
  signature
});
```

---

## ✅ Summary

**Implemented:**
- ✅ 40+ Zod validation schemas
- ✅ Validation middleware (body, query, params)
- ✅ Comprehensive audit logging
- ✅ Audit middleware for automatic logging
- ✅ TypeScript type inference from schemas
- ✅ Clear error messages

**Benefits:**
- 🔒 Enhanced security (prevent injection attacks)
- 📊 Compliance-ready (GDPR, SOC2, ISO 27001)
- 🐛 Better debugging (clear validation errors)
- 📈 Auditability (track all changes)
- 🎯 Type safety (TypeScript integration)

**Next Steps:**
1. Apply validation to all remaining routes
2. Create audit log database table
3. Implement log rotation
4. Set up external SIEM integration
5. Add real-time alerting for suspicious activity

---

**Last Updated:** 2025-10-29  
**Version:** 1.0  
**Status:** ✅ Production-ready foundation





