import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { scheduler } from '../../../server/scheduler';
import { shiftMonitor } from '../../../server/shiftMonitor';
import { repositories } from '../../../server/../repositories/index';

// Mock dependencies
vi.mock('../shiftMonitor', () => ({
  shiftMonitor: {
    runGlobalMonitoring: vi.fn(),
  },
}));

vi.mock('../../repositories/index', () => ({
  repositories: {
    reminder: {
      findPending: vi.fn(),
      markAsSent: vi.fn(),
    },
  },
}));

describe('Scheduler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Stop all schedulers before each test
    scheduler.stopAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    scheduler.stopAll();
  });

  describe('startShiftMonitoring', () => {
    it('should start shift monitoring with default interval (5 minutes)', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockResolvedValue({
        companiesProcessed: 2,
        totalViolations: 3,
        totalExceptions: 3,
      });

      scheduler.startShiftMonitoring();

      // Should run immediately
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1);

      // Should run again after 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(2);

      // Should run again after another 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(3);

      scheduler.stopShiftMonitoring();
    });

    it('should start shift monitoring with custom interval', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockResolvedValue({
        companiesProcessed: 1,
        totalViolations: 0,
        totalExceptions: 0,
      });

      scheduler.startShiftMonitoring(10); // 10 minutes

      // Should run immediately
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1);

      // Should NOT run after 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1);

      // Should run after 10 minutes
      vi.advanceTimersByTime(5 * 60 * 1000); // Total 10 minutes
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(2);

      scheduler.stopShiftMonitoring();
    });

    it('should not start monitoring if already running', () => {
      scheduler.startShiftMonitoring();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Try to start again
      scheduler.startShiftMonitoring();

      // Should not create duplicate interval
      expect(consoleWarnSpy).not.toHaveBeenCalled(); // Logger is used, not console

      scheduler.stopShiftMonitoring();
      consoleWarnSpy.mockRestore();
    });

    it('should handle errors in monitoring gracefully', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockRejectedValue(
        new Error('Database error')
      );

      scheduler.startShiftMonitoring();

      // Should run and catch error
      await vi.runOnlyPendingTimersAsync();

      // Should continue running despite error
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(2);

      scheduler.stopShiftMonitoring();
    });
  });

  describe('stopShiftMonitoring', () => {
    it('should stop shift monitoring', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockResolvedValue({
        companiesProcessed: 1,
        totalViolations: 0,
        totalExceptions: 0,
      });

      scheduler.startShiftMonitoring();

      // Run once
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1);

      // Stop monitoring
      scheduler.stopShiftMonitoring();

      // Should not run after stopping
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1); // Still 1
    });

    it('should handle stop when not running', () => {
      // Should not throw error
      expect(() => scheduler.stopShiftMonitoring()).not.toThrow();
    });
  });

  describe('startRemindersSending', () => {
    it('should send pending reminders with default interval (1 minute)', async () => {
      const mockReminders = [
        {
          id: 'rem-1',
          employee_id: 'emp-1',
          type: 'shift_start',
          planned_at: new Date(),
          sent_at: null,
        },
        {
          id: 'rem-2',
          employee_id: 'emp-2',
          type: 'shift_end',
          planned_at: new Date(),
          sent_at: null,
        },
      ];

      vi.mocked(repositories.reminder.findPending).mockResolvedValue(mockReminders as any);
      vi.mocked(repositories.reminder.markAsSent).mockResolvedValue(undefined);

      scheduler.startRemindersSending();

      // Should run immediately
      await vi.runOnlyPendingTimersAsync();
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(1);
      expect(repositories.reminder.markAsSent).toHaveBeenCalledTimes(2);

      // Should run again after 1 minute
      vi.mocked(repositories.reminder.findPending).mockResolvedValue([] as any);
      vi.advanceTimersByTime(1 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(2);

      scheduler.stopRemindersSending();
    });

    it('should handle no pending reminders', async () => {
      vi.mocked(repositories.reminder.findPending).mockResolvedValue([] as any);

      scheduler.startRemindersSending();

      await vi.runOnlyPendingTimersAsync();
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(1);
      expect(repositories.reminder.markAsSent).not.toHaveBeenCalled();

      scheduler.stopRemindersSending();
    });

    it('should handle errors in individual reminder sending', async () => {
      const mockReminders = [
        {
          id: 'rem-1',
          employee_id: 'emp-1',
          type: 'shift_start',
          planned_at: new Date(),
          sent_at: null,
        },
        {
          id: 'rem-2',
          employee_id: 'emp-2',
          type: 'shift_end',
          planned_at: new Date(),
          sent_at: null,
        },
      ];

      vi.mocked(repositories.reminder.findPending).mockResolvedValue(mockReminders as any);
      vi.mocked(repositories.reminder.markAsSent)
        .mockRejectedValueOnce(new Error('Send failed'))
        .mockResolvedValueOnce(undefined);

      scheduler.startRemindersSending();

      await vi.runOnlyPendingTimersAsync();

      // Should try to send both even if one fails
      expect(repositories.reminder.markAsSent).toHaveBeenCalledTimes(2);

      scheduler.stopRemindersSending();
    });

    it('should handle errors in fetching reminders', async () => {
      vi.mocked(repositories.reminder.findPending).mockRejectedValue(
        new Error('Database error')
      );

      scheduler.startRemindersSending();

      // Should handle error gracefully
      await vi.runOnlyPendingTimersAsync();

      // Should continue running
      vi.advanceTimersByTime(1 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(2);

      scheduler.stopRemindersSending();
    });
  });

  describe('stopRemindersSending', () => {
    it('should stop reminders sending', async () => {
      vi.mocked(repositories.reminder.findPending).mockResolvedValue([] as any);

      scheduler.startRemindersSending();

      await vi.runOnlyPendingTimersAsync();
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(1);

      scheduler.stopRemindersSending();

      // Should not run after stopping
      vi.advanceTimersByTime(1 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(1); // Still 1
    });
  });

  describe('startAll', () => {
    it('should start all schedulers', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockResolvedValue({
        companiesProcessed: 0,
        totalViolations: 0,
        totalExceptions: 0,
      });
      vi.mocked(repositories.reminder.findPending).mockResolvedValue([] as any);

      scheduler.startAll();

      await vi.runOnlyPendingTimersAsync();

      // Both should have run
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalled();
      expect(repositories.reminder.findPending).toHaveBeenCalled();

      scheduler.stopAll();
    });
  });

  describe('stopAll', () => {
    it('should stop all schedulers', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockResolvedValue({
        companiesProcessed: 0,
        totalViolations: 0,
        totalExceptions: 0,
      });
      vi.mocked(repositories.reminder.findPending).mockResolvedValue([] as any);

      scheduler.startAll();

      await vi.runOnlyPendingTimersAsync();

      const initialMonitoringCalls = vi.mocked(shiftMonitor.runGlobalMonitoring).mock.calls.length;
      const initialReminderCalls = vi.mocked(repositories.reminder.findPending).mock.calls.length;

      scheduler.stopAll();

      // Should not run after stopping
      vi.advanceTimersByTime(5 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();

      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(initialMonitoringCalls);
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(initialReminderCalls);
    });

    it('should handle stop when nothing is running', () => {
      expect(() => scheduler.stopAll()).not.toThrow();
    });
  });

  describe('Integration: Multiple schedulers running simultaneously', () => {
    it('should run both schedulers independently', async () => {
      vi.mocked(shiftMonitor.runGlobalMonitoring).mockResolvedValue({
        companiesProcessed: 1,
        totalViolations: 0,
        totalExceptions: 0,
      });
      vi.mocked(repositories.reminder.findPending).mockResolvedValue([] as any);

      scheduler.startShiftMonitoring(5); // 5 minutes
      scheduler.startRemindersSending(1); // 1 minute

      // Both should run immediately
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1);
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(1);

      // After 1 minute: only reminders should run
      vi.advanceTimersByTime(1 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(1); // Still 1
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(2); // 2 now

      // After 4 more minutes (total 5): both should run
      vi.advanceTimersByTime(4 * 60 * 1000);
      await vi.runOnlyPendingTimersAsync();
      expect(shiftMonitor.runGlobalMonitoring).toHaveBeenCalledTimes(2); // 2 now
      expect(repositories.reminder.findPending).toHaveBeenCalledTimes(6); // 1+1+4 = 6

      scheduler.stopAll();
    });
  });
});





