# 📚 API Documentation Guide

Complete API documentation with Swagger/OpenAPI integration.

## Overview

This project's REST API is documented using **OpenAPI 3.0** specification. The API provides endpoints for:
- 🔐 Authentication & Authorization
- 👥 Employee Management
- ⏱️ Shift Tracking
- 📊 Rating System
- ⚠️ Violations & Exceptions
- 📅 Schedule Management
- 🤖 Telegram Bot Integration

---

## Quick Start

### Access Documentation

Once the Swagger setup is complete, documentation will be available at:

```
Development: http://localhost:5000/api-docs
Production: https://your-domain.com/api-docs
```

### Interactive API Testing

Swagger UI provides:
- 📖 Complete API reference
- 🧪 Interactive request testing
- 📝 Request/response schemas
- 🔐 Authentication testing

---

## Setup Swagger (Recommended)

### Install Dependencies

```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

### Create Swagger Configuration

**File: `server/config/swagger.ts`**

```typescript
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Shift Manager API',
      version: '1.0.0',
      description: 'REST API для системы управления сменами и рейтингом сотрудников',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
      {
        url: 'https://your-domain.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Supabase JWT token',
        },
        BotSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Bot-Secret',
          description: 'Bot API secret key',
        },
      },
    },
    security: [
      {
        BearerAuth: [],
      },
    ],
  },
  apis: ['./server/routes/*.ts'], // Path to API routes
};

export const swaggerSpec = swaggerJsdoc(options);
```

### Add to Express App

**File: `server/index.ts` or `server/routes/index.ts`**

```typescript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Shift Manager API',
}));

// Serve OpenAPI JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
```

---

## API Documentation Examples

### Authentication Endpoints

**File: `server/routes/auth.ts`**

```typescript
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Register new admin user with company
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - company_name
 *               - full_name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: SecurePassword123
 *               company_name:
 *                 type: string
 *                 example: ООО "Моя Компания"
 *               full_name:
 *                 type: string
 *                 example: Иван Петров
 *     responses:
 *       201:
 *         description: User and company created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 company:
 *                   $ref: '#/components/schemas/Company'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: User already exists
 */
router.post("/register", authRateLimit, async (req, res) => {
  // Implementation
});
```

### Employee Endpoints

```typescript
/**
 * @openapi
 * /api/companies/{companyId}/employees:
 *   get:
 *     summary: Get all employees for a company
 *     tags:
 *       - Employees
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: companyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company UUID
 *     responses:
 *       200:
 *         description: List of employees
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Employee'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - not your company
 *       404:
 *         description: Company not found
 *   post:
 *     summary: Create new employee
 *     tags:
 *       - Employees
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: companyId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeRequest'
 *     responses:
 *       201:
 *         description: Employee created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 */
```

### Schemas

```typescript
/**
 * @openapi
 * components:
 *   schemas:
 *     Employee:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         company_id:
 *           type: string
 *           format: uuid
 *         full_name:
 *           type: string
 *         position:
 *           type: string
 *         telegram_id:
 *           type: string
 *           nullable: true
 *         telegram_username:
 *           type: string
 *           nullable: true
 *         is_active:
 *           type: boolean
 *         created_at:
 *           type: string
 *           format: date-time
 *     CreateEmployeeRequest:
 *       type: object
 *       required:
 *         - full_name
 *         - position
 *       properties:
 *         full_name:
 *           type: string
 *           example: Анна Смирнова
 *         position:
 *           type: string
 *           example: Менеджер
 *         telegram_username:
 *           type: string
 *           example: anna_smirnova
 *     Shift:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         employee_id:
 *           type: string
 *           format: uuid
 *         start_time:
 *           type: string
 *           format: date-time
 *         end_time:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [working, break, completed]
 *         current_break_start:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Invalid input
 *         message:
 *           type: string
 *           example: Email is required
 *         details:
 *           type: object
 */
```

---

## Complete API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register admin + company | None |
| POST | `/api/auth/login` | Login (via Supabase) | None |

### Companies

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies/:id` | Get company details | Bearer |
| PUT | `/api/companies/:id` | Update company | Bearer |

### Employees

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies/:companyId/employees` | List employees | Bearer |
| POST | `/api/companies/:companyId/employees` | Create employee | Bearer |
| GET | `/api/employees/:id` | Get employee | Bearer |
| PUT | `/api/employees/:id` | Update employee | Bearer |
| DELETE | `/api/employees/:id` | Delete employee | Bearer |

### Shifts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies/:companyId/shifts` | List shifts | Bearer |
| GET | `/api/companies/:companyId/shifts/active` | List active shifts | Bearer |
| POST | `/api/employees/:employeeId/shifts` | Start shift | Bearer |
| PUT | `/api/shifts/:id/end` | End shift | Bearer |
| POST | `/api/shifts/:id/break/start` | Start break | Bearer |
| POST | `/api/shifts/:id/break/end` | End break | Bearer |

### Ratings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies/:companyId/ratings` | Get employee ratings | Bearer |
| GET | `/api/employees/:employeeId/rating` | Get specific rating | Bearer |

### Violations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies/:companyId/violations` | List violations | Bearer |
| POST | `/api/violations` | Create violation | Bearer |
| GET | `/api/companies/:companyId/violation-rules` | List rules | Bearer |
| POST | `/api/companies/:companyId/violation-rules` | Create rule | Bearer |
| PUT | `/api/violation-rules/:id` | Update rule | Bearer |
| DELETE | `/api/violation-rules/:id` | Delete rule | Bearer |

### Exceptions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/companies/:companyId/exceptions` | List exceptions | Bearer |
| POST | `/api/companies/:companyId/exceptions/:id/resolve` | Resolve exception | Bearer |

### Bot API

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/employee-invites/:code/accept` | Link Telegram | Bot Secret |
| GET | `/api/bot/employees/:telegramId` | Get employee data | Bot Secret |
| POST | `/api/bot/shifts/start` | Start shift | Bot Secret |
| POST | `/api/bot/shifts/end` | End shift | Bot Secret |
| POST | `/api/bot/breaks/start` | Start break | Bot Secret |
| POST | `/api/bot/breaks/end` | End break | Bot Secret |

### Health & Monitoring

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/health` | Health check | None |
| GET | `/api/health/live` | Liveness probe | None |
| GET | `/api/health/ready` | Readiness probe | None |
| GET | `/metrics` | Prometheus metrics | None |

---

## Authentication

### Bearer Token (JWT)

Most endpoints require JWT authentication via Supabase:

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:5000/api/companies/123
```

### Bot API Secret

Bot API endpoints use a secret header:

```bash
curl -H "X-Bot-Secret: YOUR_BOT_SECRET" \
  http://localhost:5000/api/bot/employees/12345
```

---

## Request/Response Examples

### Create Employee

**Request:**
```bash
POST /api/companies/550e8400-e29b-41d4-a716-446655440000/employees
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{
  "full_name": "Мария Иванова",
  "position": "Кассир",
  "telegram_username": "maria_ivanova"
}
```

**Response (201):**
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "company_id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Мария Иванова",
  "position": "Кассир",
  "telegram_username": "maria_ivanova",
  "telegram_id": null,
  "is_active": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Start Shift

**Request:**
```bash
POST /api/employees/660e8400-e29b-41d4-a716-446655440000/shifts
Authorization: Bearer eyJhbGc...
Content-Type: application/json

{}
```

**Response (201):**
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "employee_id": "660e8400-e29b-41d4-a716-446655440000",
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": null,
  "status": "working",
  "current_break_start": null
}
```

### Get Ratings

**Request:**
```bash
GET /api/companies/550e8400-e29b-41d4-a716-446655440000/ratings?periodStart=2024-01-01&periodEnd=2024-01-31
Authorization: Bearer eyJhbGc...
```

**Response (200):**
```json
[
  {
    "employee_id": "660e8400-e29b-41d4-a716-446655440000",
    "employee_name": "Мария Иванова",
    "rating": 95.5,
    "violations_count": 2,
    "completed_shifts": 22
  },
  {
    "employee_id": "770e8400-e29b-41d4-a716-446655440000",
    "employee_name": "Иван Петров",
    "rating": 88.0,
    "violations_count": 5,
    "completed_shifts": 20
  }
]
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Validation Error",
  "message": "Email is required",
  "details": {
    "field": "email",
    "code": "required"
  }
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request succeeded |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Missing/invalid auth |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

---

## Rate Limiting

API endpoints are rate limited:

| Endpoint | Limit | Window |
|----------|-------|--------|
| Auth endpoints | 5 requests | 15 minutes |
| Bot API | 120 requests | 1 minute |
| Other API | 100 requests | 1 minute |

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699876600
Retry-After: 42
```

---

## Pagination

For endpoints that return lists:

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

---

## Filtering & Sorting

### Filtering

```bash
GET /api/companies/550e.../employees?is_active=true&position=Кассир
```

### Sorting

```bash
GET /api/companies/550e.../ratings?sortBy=rating&order=desc
```

---

## WebSocket API

### Connection

```javascript
const ws = new WebSocket('ws://localhost:5000/ws?companyId=550e...');
```

### Events

**Server → Client:**

```javascript
// Dashboard update
{
  "type": "dashboard_update",
  "data": {
    "totalEmployees": 25,
    "activeShifts": 12,
    "exceptions": 3
  }
}

// Shift started
{
  "type": "shift_started",
  "data": {
    "shift_id": "770e...",
    "employee_name": "Мария Иванова"
  }
}

// New violation
{
  "type": "violation_created",
  "data": {
    "employee_name": "Иван Петров",
    "rule_name": "Опоздание"
  }
}
```

---

## Testing with Postman

### Import Collection

1. Export OpenAPI spec:
   ```bash
   curl http://localhost:5000/api-docs.json > api-spec.json
   ```

2. Import to Postman:
   - File → Import → Upload `api-spec.json`

### Environment Variables

Create Postman environment with:
- `BASE_URL`: `http://localhost:5000`
- `BEARER_TOKEN`: Your JWT token
- `BOT_SECRET`: Your bot secret
- `COMPANY_ID`: Your company UUID

---

## Alternative: Manual Documentation

If Swagger is not set up, see complete endpoint documentation in:
- `TODO.md` - Task tracking
- `VALIDATION_AND_AUDIT_GUIDE.md` - Input validation
- `WEBSOCKET_GUIDE.md` - WebSocket events
- `TELEGRAM_WEBHOOK_SETUP.md` - Telegram integration

---

## Component Documentation (Storybook)

### Setup Storybook (Optional)

```bash
npx storybook@latest init
```

### Write Stories

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Кнопка',
    variant: 'default',
  },
};

export const Destructive: Story = {
  args: {
    children: 'Удалить',
    variant: 'destructive',
  },
};
```

### Run Storybook

```bash
npm run storybook
```

Access at `http://localhost:6006`

---

## Summary

✅ **API Documentation:**
- OpenAPI 3.0 specification
- Swagger UI setup guide
- Complete endpoint reference
- Request/response examples
- Authentication guide
- Error handling
- Rate limiting info
- WebSocket documentation

📚 **Resources:**
- Swagger UI: Interactive testing
- Postman: API client
- OpenAPI: Standard spec
- Storybook: Component docs

🎯 **Next Steps:**
- Implement Swagger setup
- Add JSDoc comments to routes
- Test all endpoints
- Keep docs up to date




