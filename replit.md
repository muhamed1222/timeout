# ShiftManager - Employee Shift Management System

## Overview

ShiftManager is a comprehensive employee shift management system designed to track work hours, breaks, and daily reports through Telegram integration. The system consists of a dark-themed admin dashboard for managers and a light-themed Telegram WebApp interface for employees. The application enables real-time shift monitoring, exception tracking, and automated violation detection for enterprise workforce management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens and dark/light theme support
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Design System**: Dual-theme approach with dark mode for admin dashboard and light mode for Telegram WebApp

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Session Management**: Express sessions with PostgreSQL storage
- **API Design**: RESTful endpoints with structured error handling and request/response logging
- **Validation**: Zod schemas for request validation and type coercion

### Database Schema Design
- **Core Entities**: Companies, employees, shifts, work intervals, break intervals, daily reports
- **Audit System**: Exception tracking with severity levels and automated violation detection
- **Authentication**: Supabase Auth integration for admin users with role-based access
- **Telegram Integration**: Employee identification via Telegram user IDs with invite code system

### Authentication & Authorization
- **Admin Authentication**: Supabase Auth for dashboard access with company-based authorization
- **Employee Authentication**: Telegram WebApp authentication using cryptographic signature verification
- **Role-Based Access**: Company-scoped data access with admin role management
- **WebApp Security**: X-Telegram-Init-Data header validation for all mutation endpoints

### Employee Invitation System
- **Invite Generation**: Cryptographically secure invite codes via randomBytes(16)
- **Deep Link Integration**: Telegram bot deep links (t.me/botname?start=CODE) for seamless onboarding
- **Race Condition Prevention**: Temporary employee ID reservation strategy prevents concurrent redemption
- **Rollback Logic**: Failed employee creation releases invite reservation for retry capability
- **Duplicate Detection**: Unique constraint handling for telegram_user_id prevents duplicate accounts
- **Single-Use Enforcement**: Atomic database updates ensure invites can only be used once
- **QR Code Support**: Auto-generated QR codes for easy invite distribution via /api/employee-invites/:code/link

### Real-Time Monitoring
- **Shift Monitor Service**: Automated violation detection for late arrivals, early departures, and extended breaks
- **Exception System**: Configurable threshold-based alerting with severity classification
- **Status Tracking**: Real-time employee status updates (working, on break, off work)

### Design Architecture
- **Component Library**: Reusable UI components with consistent design patterns
- **Theme System**: CSS custom properties for seamless dark/light mode switching
- **Typography**: Inter font family for professional appearance
- **Color Palette**: Semantic color system with shift-specific status colors
- **Layout System**: Consistent spacing using Tailwind utilities with hover and active states

## External Dependencies

### Database & Hosting
- **PostgreSQL**: Primary database with SSL support for production environments
- **Neon Database**: Serverless PostgreSQL hosting via @neondatabase/serverless

### Authentication & Security
- **Supabase**: Authentication service for admin user management
- **Telegram Bot API**: Employee authentication and communication platform

### UI Framework & Styling
- **Radix UI**: Unstyled component primitives for accessibility and customization
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Component variant management for design consistency

### Development & Build Tools
- **Vite**: Build tool with HMR and development server
- **TypeScript**: Type safety across frontend and backend
- **Drizzle Kit**: Database migrations and schema management
- **ESBuild**: Fast JavaScript bundling for production builds

### Data & State Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Hook Form**: Form handling with validation integration
- **Date-fns**: Date manipulation and formatting with internationalization support

### Monitoring & Development
- **Replit Integration**: Development environment with runtime error overlay and debugging tools
- **Express Logging**: Structured request/response logging for API monitoring

## Admin Dashboard Implementation (October 2025)

### Completed Pages
All admin dashboard pages are fully implemented and integrated with live API endpoints:

1. **Dashboard (/)** - Real-time statistics and employee status overview
   - Active shifts counter with live data
   - Today's exceptions tracking
   - Total employees count
   - Employee status cards (working, on break, off work)
   - Integration: `/api/companies/:companyId/stats` endpoint

2. **Exceptions (/exceptions)** - Exception monitoring and management
   - Real-time exception list with severity filtering
   - Employee name resolution
   - Timestamp formatting with timezone support
   - Empty states and loading indicators
   - Integration: `/api/companies/:companyId/exceptions` endpoint

3. **Employees (/employees)** - Employee management with invite system
   - Employee list with status badges
   - Schedule template assignment via dialogs
   - Production-ready invite code generation (16-byte cryptographic codes)
   - QR code generation for invites
   - Deep link integration (t.me/botname?start=CODE)
   - Integration: Multiple endpoints (employees, invites, schedule templates)

4. **Reports (/reports)** - Daily report viewing and export
   - Report list with employee filtering
   - Date range filtering (last 7 days, 30 days, all time)
   - Export to CSV functionality
   - Report details with work/break interval visualization
   - Integration: `/api/companies/:companyId/daily-reports` endpoint

5. **Schedules (/schedules)** - Work schedule template management
   - Template CRUD operations (create, read, update, delete)
   - Workday selection (Mon-Sun checkboxes)
   - Shift time configuration (HH:MM format)
   - Employee assignment system
   - Integration: `/api/schedule-templates` endpoints

6. **Settings (/settings)** - User preferences management
   - User profile display
   - Notification settings toggle
   - Language selection (Russian/English)
   - Theme preferences

7. **Company Settings (/company)** - Organization configuration
   - Company name management
   - Timezone configuration with Russian cities
   - Company ID display
   - Integration: `/api/companies/:companyId` PUT endpoint

### Technical Implementation Details

#### Authentication Flow
- **useAuth Hook**: Shared authentication hook providing `user`, `companyId`, and `loading` states
- **Supabase Integration**: Admin authentication via Supabase Auth
- **Company Scoping**: All API requests automatically scoped to user's company_id

#### Data Fetching Pattern
- **TanStack Query**: All pages use React Query for server state management
- **apiRequest Utility**: Authenticated fetch wrapper with automatic token injection
- **Cache Invalidation**: Proper cache invalidation after mutations
- **Loading States**: Skeleton loaders and spinners during data fetching
- **Error Handling**: Toast notifications for API errors

#### UI/UX Patterns
- **Empty States**: Contextual empty state messages for zero-data scenarios
- **Confirmation Dialogs**: Destructive actions require user confirmation
- **Real-time Updates**: Query refetching and cache invalidation for live updates
- **Responsive Design**: Mobile-friendly layouts with Tailwind CSS
- **Russian Localization**: All UI text in Russian language

#### Fixed Issues
- **Schedule Template Payload**: Corrected to send `{ company_id, name, rules: { shift_start, shift_end, workdays } }`
- **Invite Link Authentication**: Fixed unauthenticated fetch to use apiRequest with proper auth headers
- **Form Validation**: Zod resolver integration for all forms with proper error display

### Production Readiness Status
✅ All admin pages fully functional
✅ API integration complete with proper error handling
✅ Authentication and authorization working
✅ Loading states and empty states implemented
✅ Cache invalidation and real-time updates working
✅ Russian localization complete
✅ Mobile-responsive design
✅ Architect-reviewed and approved

### Next Steps for Production
1. End-to-end smoke testing in production environment
2. Verify Supabase auth token propagation in production
3. Monitor runtime logs for API validation errors
4. Performance optimization if needed