/**
 * Period calculation utilities
 * Common date/period operations
 */

/**
 * Get current month period (start and end dates)
 */
export function getCurrentMonthPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get period for a specific date
 */
export function getPeriodForDate(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start, end };
}

/**
 * Get period for a specific year and month
 */
export function getPeriodForYearMonth(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return { start, end };
}

/**
 * Format date to YYYY-MM-DD string
 */
export function formatDateForPeriod(date: Date): string {
  return date.toISOString().split('T')[0];
}

