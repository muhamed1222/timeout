# 📖 Swagger API Documentation Setup

**Status:** ✅ Ready to Install  
**Version:** 1.0  
**Access:** `http://localhost:5000/api/docs`

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install swagger-jsdoc swagger-ui-express
npm install --save-dev @types/swagger-jsdoc @types/swagger-ui-express
```

### 2. Enable Swagger in Server

Edit `server/index.ts`:

```typescript
import { setupSwagger } from './swagger.js';

// ... после создания app
const app = express();

// ... middleware setup

// Enable Swagger (только в development/staging)
if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_DOCS === 'true') {
  setupSwagger(app);
}
```

### 3. Start Server

```bash
npm run dev

# Swagger docs available at:
# http://localhost:5000/api/docs
```

---

## 📝 Adding API Documentation

### JSDoc Comments Format

Add JSDoc comments above your route handlers:

```typescript
/**
 * @swagger
 * /api/companies/{companyId}/employees:
 *   get:
 *     summary: Get all employees for a company
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: companyId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Company ID
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
 *       404:
 *         description: Company not found
 */
router.get("/:companyId/employees", async (req, res) => {
  // ... handler code
});
```

---

## 📚 Documentation Examples

### Example 1: GET Endpoint

```typescript
/**
 * @swagger
 * /api/companies/{id}/stats:
 *   get:
 *     summary: Get company statistics
 *     description: Returns aggregated statistics for a company including employee count, active shifts, etc.
 *     tags: [Companies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Company statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEmployees:
 *                   type: integer
 *                   example: 25
 *                 activeShifts:
 *                   type: integer
 *                   example: 10
 *                 completedShifts:
 *                   type: integer
 *                   example: 150
 *                 exceptions:
 *                   type: integer
 *                   example: 3
 */
```

### Example 2: POST Endpoint

```typescript
/**
 * @swagger
 * /api/employees:
 *   post:
 *     summary: Create new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - company_id
 *               - full_name
 *             properties:
 *               company_id:
 *                 type: string
 *                 format: uuid
 *               full_name:
 *                 type: string
 *                 example: "John Doe"
 *               position:
 *                 type: string
 *                 example: "Software Engineer"
 *     responses:
 *       201:
 *         description: Employee created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employee'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
```

### Example 3: PUT Endpoint

```typescript
/**
 * @swagger
 * /api/shifts/{id}/start:
 *   post:
 *     summary: Start a shift
 *     description: Marks shift as started and creates work interval
 *     tags: [Shifts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actual_start_at:
 *                 type: string
 *                 format: date-time
 *                 description: Start time (defaults to now if not provided)
 *     responses:
 *       200:
 *         description: Shift started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Shift'
 */
```

---

## 🎨 Customization

### Add Custom Schemas

In `server/swagger.ts`, add to `components.schemas`:

```typescript
CustomSchema: {
  type: 'object',
  properties: {
    field1: { type: 'string' },
    field2: { type: 'number' },
  },
},
```

### Add Tags

```typescript
tags: [
  {
    name: 'YourTag',
    description: 'Description for your tag',
  },
],
```

---

## 🔒 Security

### Production Deployment

For production, disable Swagger or require authentication:

```typescript
// Option 1: Disable in production
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// Option 2: Require auth in production
app.use('/api/docs', requireAuth, swaggerUi.serve, swaggerUi.setup(spec));
```

---

## 📊 Features

✅ **Interactive UI** - Try out API endpoints directly from browser  
✅ **Schema Validation** - OpenAPI 3.0 compliant  
✅ **Auto-generated** - From JSDoc comments  
✅ **Authentication** - Bearer token support  
✅ **Export** - OpenAPI JSON at `/api/docs.json`

---

## 🛠️ Usage Tips

### 1. Testing with Authentication

1. Get JWT token from Supabase
2. Click "Authorize" button in Swagger UI
3. Enter: `Bearer <your-token>`
4. Try protected endpoints

### 2. Export OpenAPI Spec

```bash
curl http://localhost:5000/api/docs.json > openapi.json
```

### 3. Generate Client SDKs

```bash
# Install openapi-generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:5000/api/docs.json \
  -g typescript-axios \
  -o client-sdk
```

---

## 📚 Resources

- [Swagger UI](https://swagger.io/tools/swagger-ui/)
- [OpenAPI 3.0 Spec](https://swagger.io/specification/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)

---

## ✅ Next Steps

1. ✅ Install dependencies
2. ✅ Enable in server
3. ⏳ Document existing endpoints (add JSDoc comments)
4. ⏳ Test in browser
5. ⏳ Export OpenAPI spec

**Estimated time to document all endpoints:** ~2-3 hours

---

**Created:** 29 октября 2025  
**Status:** Ready for implementation

