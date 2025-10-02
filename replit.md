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