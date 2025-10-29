/**
 * Swagger/OpenAPI Documentation Setup
 * 
 * Interactive API documentation available at /api/docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ShiftManager API',
      version: '1.0.0',
      description: `
# ShiftManager API Documentation

Comprehensive API для управления сменами сотрудников с интеграцией Telegram.

## Features

- 👥 **Employee Management** - CRUD операции для сотрудников
- ⏰ **Shift Management** - Планирование и отслеживание смен
- ☕ **Break Management** - Управление перерывами
- 🚨 **Violation System** - Автоматическое обнаружение нарушений
- ⭐ **Rating System** - Динамический расчет рейтингов
- 📱 **Telegram Integration** - WebApp и Bot API
- 📊 **Analytics** - Статистика и отчеты

## Authentication

API использует Supabase Auth для аутентификации.
Для большинства endpoints требуется JWT token в заголовке Authorization.

\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Rate Limiting

- Standard API: 60 requests/minute
- Auth endpoints: 5 attempts/15 minutes
- Bot API: 120 requests/minute
      `,
      contact: {
        name: 'API Support',
        email: 'support@shiftmanager.com',
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
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token from Supabase Auth',
        },
        telegramAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-telegram-init-data',
          description: 'Telegram WebApp initData for authentication',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Company: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            timezone: { type: 'string', default: 'Europe/Amsterdam' },
            locale: { type: 'string', default: 'ru' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Employee: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            full_name: { type: 'string' },
            position: { type: 'string', nullable: true },
            telegram_user_id: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['active', 'inactive'], default: 'active' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Shift: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employee_id: { type: 'string', format: 'uuid' },
            planned_start_at: { type: 'string', format: 'date-time' },
            planned_end_at: { type: 'string', format: 'date-time' },
            actual_start_at: { type: 'string', format: 'date-time', nullable: true },
            actual_end_at: { type: 'string', format: 'date-time', nullable: true },
            status: {
              type: 'string',
              enum: ['planned', 'active', 'completed', 'cancelled'],
              default: 'planned',
            },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Violation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employee_id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            rule_id: { type: 'string', format: 'uuid' },
            source: { type: 'string', enum: ['auto', 'manual'] },
            reason: { type: 'string', nullable: true },
            penalty: { type: 'number', format: 'float' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        EmployeeRating: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employee_id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            period_start: { type: 'string', format: 'date' },
            period_end: { type: 'string', format: 'date' },
            rating: { type: 'number', format: 'float', minimum: 0, maximum: 100 },
            status: { type: 'string', enum: ['active', 'warning', 'terminated'] },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      {
        name: 'Auth',
        description: 'Authentication endpoints',
      },
      {
        name: 'Companies',
        description: 'Company management',
      },
      {
        name: 'Employees',
        description: 'Employee management',
      },
      {
        name: 'Shifts',
        description: 'Shift management',
      },
      {
        name: 'Violations',
        description: 'Violation and rating system',
      },
      {
        name: 'Invites',
        description: 'Employee invitation system',
      },
      {
        name: 'Telegram',
        description: 'Telegram WebApp and Bot API',
      },
      {
        name: 'Health',
        description: 'Health checks and monitoring',
      },
    ],
  },
  apis: [
    './server/routes/*.ts',
    './server/routes.ts',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Setup Swagger UI middleware
 */
export function setupSwagger(app: Express): void {
  // Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'ShiftManager API Docs',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai',
        },
      },
    })
  );

  // Swagger JSON
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log('📖 Swagger docs available at /api/docs');
}

export { swaggerSpec };

