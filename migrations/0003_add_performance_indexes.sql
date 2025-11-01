-- Migration: Add Performance Indexes
-- Date: 2025-01-XX
-- Purpose: Add indexes for frequently queried columns to improve query performance

-- Employee table indexes
-- Index for company-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_employee_company_id ON employee(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_company_status ON employee(company_id, status);
CREATE INDEX IF NOT EXISTS idx_employee_status ON employee(status);

-- Shift table indexes
-- Index for employee-based shift queries
CREATE INDEX IF NOT EXISTS idx_shift_employee_id ON shift(employee_id);
-- Composite index for finding active shifts by employee
CREATE INDEX IF NOT EXISTS idx_shift_employee_status ON shift(employee_id, status);
-- Index for date-based queries and sorting
CREATE INDEX IF NOT EXISTS idx_shift_planned_start_at ON shift(planned_start_at DESC);
-- Composite index for active shifts by company (via employee_id)
CREATE INDEX IF NOT EXISTS idx_shift_status_planned_start ON shift(status, planned_start_at DESC);

-- Work interval indexes
CREATE INDEX IF NOT EXISTS idx_work_interval_shift_id ON work_interval(shift_id);
CREATE INDEX IF NOT EXISTS idx_work_interval_start_at ON work_interval(start_at);

-- Break interval indexes
CREATE INDEX IF NOT EXISTS idx_break_interval_shift_id ON break_interval(shift_id);
CREATE INDEX IF NOT EXISTS idx_break_interval_start_at ON break_interval(start_at);

-- Daily report indexes
CREATE INDEX IF NOT EXISTS idx_daily_report_shift_id ON daily_report(shift_id);
CREATE INDEX IF NOT EXISTS idx_daily_report_submitted_at ON daily_report(submitted_at DESC);

-- Exception indexes
CREATE INDEX IF NOT EXISTS idx_exception_employee_id ON exception(employee_id);
CREATE INDEX IF NOT EXISTS idx_exception_date ON exception(date DESC);
CREATE INDEX IF NOT EXISTS idx_exception_resolved_at ON exception(resolved_at) WHERE resolved_at IS NULL;

-- Reminder indexes
CREATE INDEX IF NOT EXISTS idx_reminder_employee_id ON reminder(employee_id);
CREATE INDEX IF NOT EXISTS idx_reminder_planned_at ON reminder(planned_at);
-- Partial index for pending reminders (most common query)
CREATE INDEX IF NOT EXISTS idx_reminder_pending ON reminder(planned_at) WHERE sent_at IS NULL;

-- Violation indexes
CREATE INDEX IF NOT EXISTS idx_violation_employee_id ON violations(employee_id);
CREATE INDEX IF NOT EXISTS idx_violation_company_id ON violations(company_id);
CREATE INDEX IF NOT EXISTS idx_violation_rule_id ON violations(rule_id);
CREATE INDEX IF NOT EXISTS idx_violation_created_at ON violations(created_at DESC);
-- Composite index for rating calculations
CREATE INDEX IF NOT EXISTS idx_violation_employee_created ON violations(employee_id, created_at DESC);

-- Company violation rules indexes
CREATE INDEX IF NOT EXISTS idx_violation_rule_company_id ON company_violation_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_violation_rule_company_active ON company_violation_rules(company_id, is_active) WHERE is_active = true;

-- Employee rating indexes
CREATE INDEX IF NOT EXISTS idx_employee_rating_employee_id ON employee_rating(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_rating_period ON employee_rating(employee_id, period_start, period_end);
-- Composite index for current period ratings (most common query)
CREATE INDEX IF NOT EXISTS idx_employee_rating_current ON employee_rating(employee_id, period_start DESC) WHERE period_start >= date_trunc('month', current_date);

-- Employee schedule indexes
CREATE INDEX IF NOT EXISTS idx_employee_schedule_employee_id ON employee_schedule(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedule_valid_dates ON employee_schedule(employee_id, valid_from, valid_to);
-- Partial index for active schedules
CREATE INDEX IF NOT EXISTS idx_employee_schedule_active ON employee_schedule(employee_id, valid_from) 
  WHERE valid_to IS NULL OR valid_to >= CURRENT_DATE;

-- Schedule template indexes
CREATE INDEX IF NOT EXISTS idx_schedule_template_company_id ON schedule_template(company_id);

-- Employee invite indexes
CREATE INDEX IF NOT EXISTS idx_employee_invite_company_id ON employee_invite(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_invite_code ON employee_invite(code);
CREATE INDEX IF NOT EXISTS idx_employee_invite_used ON employee_invite(used_by_employee) WHERE used_by_employee IS NULL;
CREATE INDEX IF NOT EXISTS idx_employee_invite_created_at ON employee_invite(created_at);

-- Audit log indexes (for querying by entity/action)
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action, at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_at ON audit_log(at DESC);

-- Analyze tables to update statistics for query planner
ANALYZE employee;
ANALYZE shift;
ANALYZE work_interval;
ANALYZE break_interval;
ANALYZE daily_report;
ANALYZE exception;
ANALYZE reminder;
ANALYZE violations;
ANALYZE company_violation_rules;
ANALYZE employee_rating;
ANALYZE employee_schedule;
ANALYZE schedule_template;
ANALYZE employee_invite;
ANALYZE audit_log;
