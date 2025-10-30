-- Migration: Add performance indexes
-- Created: 2025-10-29
-- Purpose: Improve query performance for frequently accessed data

-- ============================================================================
-- SHIFT TABLE INDEXES
-- ============================================================================

-- Index for querying shifts by employee and status
-- Used in: getShiftsByEmployee, getActiveShiftsByCompany
CREATE INDEX IF NOT EXISTS idx_shift_employee_status 
  ON shift(employee_id, status)
  WHERE status != 'completed';

-- Index for querying shifts by date range
-- Used in: shift monitoring, reports
CREATE INDEX IF NOT EXISTS idx_shift_planned_dates 
  ON shift(planned_start_at, planned_end_at);

-- Partial index for active shifts only (reduces index size)
-- Used in: monitoring, dashboard stats
CREATE INDEX IF NOT EXISTS idx_shift_active 
  ON shift(employee_id, planned_start_at) 
  WHERE status = 'active';

-- Index for completed shifts (for reports)
CREATE INDEX IF NOT EXISTS idx_shift_completed 
  ON shift(employee_id, actual_end_at DESC) 
  WHERE status = 'completed';

-- ============================================================================
-- EXCEPTION TABLE INDEXES
-- ============================================================================

-- Index for querying unresolved exceptions by employee
-- Used in: employee dashboard, exception management
CREATE INDEX IF NOT EXISTS idx_exception_employee_date 
  ON exception(employee_id, date DESC) 
  WHERE resolved_at IS NULL;

-- Index for querying exceptions by company
-- Used in: company reports, monitoring
CREATE INDEX IF NOT EXISTS idx_exception_company_date 
  ON exception(date DESC, kind);

-- Index for violation linkage
-- Used in: linking exceptions to violations
CREATE INDEX IF NOT EXISTS idx_exception_violation_id 
  ON exception(violation_id) 
  WHERE violation_id IS NOT NULL;

-- ============================================================================
-- VIOLATIONS TABLE INDEXES
-- ============================================================================

-- Index for querying violations by employee and date
-- Used in: rating calculation, employee history
CREATE INDEX IF NOT EXISTS idx_violation_employee_created 
  ON violations(employee_id, created_at DESC);

-- Index for querying violations by company
-- Used in: company reports, analytics
CREATE INDEX IF NOT EXISTS idx_violation_company_date 
  ON violations(company_id, created_at DESC);

-- Index for querying by rule (for rule effectiveness analysis)
CREATE INDEX IF NOT EXISTS idx_violation_rule 
  ON violations(rule_id, created_at DESC);

-- Index for auto vs manual violations
CREATE INDEX IF NOT EXISTS idx_violation_source 
  ON violations(source, created_at DESC);

-- ============================================================================
-- EMPLOYEE TABLE INDEXES
-- ============================================================================

-- Index for querying employees by company and status
-- Used in: company employee list, active employees count
CREATE INDEX IF NOT EXISTS idx_employee_company_status 
  ON employee(company_id, status);

-- Index for Telegram user lookups
-- Used in: bot authentication, linking
CREATE INDEX IF NOT EXISTS idx_employee_telegram 
  ON employee(telegram_user_id) 
  WHERE telegram_user_id IS NOT NULL;

-- ============================================================================
-- EMPLOYEE_RATING TABLE INDEXES
-- ============================================================================

-- Composite index for rating queries by employee and period
-- Used in: rating dashboard, reports
CREATE INDEX IF NOT EXISTS idx_employee_rating_period 
  ON employee_rating(employee_id, period_start, period_end);

-- Index for company-wide rating queries
-- Used in: leaderboards, company analytics
CREATE INDEX IF NOT EXISTS idx_employee_rating_company 
  ON employee_rating(company_id, rating DESC, period_start DESC);

-- Index for low-rating employees (monitoring)
CREATE INDEX IF NOT EXISTS idx_employee_rating_low 
  ON employee_rating(company_id, rating) 
  WHERE rating < 50 AND status = 'active';

-- ============================================================================
-- WORK_INTERVAL TABLE INDEXES
-- ============================================================================

-- Index for querying work intervals by shift
-- Used in: shift details, time tracking
CREATE INDEX IF NOT EXISTS idx_work_interval_shift 
  ON work_interval(shift_id, start_at DESC);

-- Index for active work intervals (no end time)
-- Used in: current activity tracking
CREATE INDEX IF NOT EXISTS idx_work_interval_active 
  ON work_interval(shift_id, start_at DESC) 
  WHERE end_at IS NULL;

-- ============================================================================
-- BREAK_INTERVAL TABLE INDEXES
-- ============================================================================

-- Index for querying break intervals by shift
-- Used in: shift details, break tracking
CREATE INDEX IF NOT EXISTS idx_break_interval_shift 
  ON break_interval(shift_id, start_at DESC);

-- Index for active breaks (no end time)
-- Used in: current break status
CREATE INDEX IF NOT EXISTS idx_break_interval_active 
  ON break_interval(shift_id, start_at DESC) 
  WHERE end_at IS NULL;

-- ============================================================================
-- COMPANY_VIOLATION_RULES TABLE INDEXES
-- ============================================================================

-- Index for active rules by company
-- Used in: rule lookups, violation processing
CREATE INDEX IF NOT EXISTS idx_violation_rules_company 
  ON company_violation_rules(company_id, code) 
  WHERE is_active = true;

-- Index for auto-detectable rules
-- Used in: automatic monitoring
CREATE INDEX IF NOT EXISTS idx_violation_rules_auto 
  ON company_violation_rules(company_id, auto_detectable) 
  WHERE auto_detectable = true AND is_active = true;

-- ============================================================================
-- EMPLOYEE_INVITE TABLE INDEXES
-- ============================================================================

-- Index for unused invites
-- Used in: invite management, cleanup
CREATE INDEX IF NOT EXISTS idx_employee_invite_unused 
  ON employee_invite(company_id, created_at DESC) 
  WHERE used_by_employee IS NULL;

-- Index for invite code lookup (already unique, but explicit for clarity)
-- Already has unique constraint, so this is redundant but kept for documentation

-- ============================================================================
-- DAILY_REPORT TABLE INDEXES
-- ============================================================================

-- Index for reports by shift
-- Used in: shift details, report history
CREATE INDEX IF NOT EXISTS idx_daily_report_shift 
  ON daily_report(shift_id, submitted_at DESC);

-- ============================================================================
-- REMINDER TABLE INDEXES
-- ============================================================================

-- Index for pending reminders
-- Used in: reminder scheduler
CREATE INDEX IF NOT EXISTS idx_reminder_pending 
  ON reminder(planned_at ASC) 
  WHERE sent_at IS NULL;

-- Index for employee reminders
-- Used in: reminder history
CREATE INDEX IF NOT EXISTS idx_reminder_employee 
  ON reminder(employee_id, planned_at DESC);

-- ============================================================================
-- ANALYZE TABLES
-- ============================================================================
-- Update table statistics for query planner

ANALYZE shift;
ANALYZE exception;
ANALYZE violations;
ANALYZE employee;
ANALYZE employee_rating;
ANALYZE work_interval;
ANALYZE break_interval;
ANALYZE company_violation_rules;
ANALYZE employee_invite;
ANALYZE daily_report;
ANALYZE reminder;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Query to verify all indexes were created

SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN (
    'shift', 'exception', 'violations', 'employee', 
    'employee_rating', 'work_interval', 'break_interval',
    'company_violation_rules', 'employee_invite', 
    'daily_report', 'reminder'
  )
ORDER BY tablename, indexname;




