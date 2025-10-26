/**
 * ShiftService - Business logic for shift management
 */

import { storage } from "../storage.js";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import type { InsertShift, InsertWorkInterval, InsertBreakInterval } from "../../shared/schema.js";

export class ShiftService {
  /**
   * Create a new shift
   */
  async createShift(data: InsertShift) {
    try {
      const shift = await storage.createShift(data);
      
      // Get employee to invalidate company cache
      const employee = await storage.getEmployee(data.employee_id);
      if (employee) {
        cache.delete(`company:${employee.company_id}:stats`);
      }
      
      logger.info("Shift created", { 
        shiftId: shift.id, 
        employeeId: data.employee_id,
        status: shift.status 
      });
      
      return shift;
    } catch (error) {
      logger.error("Failed to create shift", error);
      throw error;
    }
  }

  /**
   * Get shift by ID
   */
  async getShift(shiftId: string) {
    try {
      const shift = await storage.getShift(shiftId);
      
      if (!shift) {
        logger.warn("Shift not found", { shiftId });
        return null;
      }
      
      return shift;
    } catch (error) {
      logger.error("Failed to get shift", error);
      throw error;
    }
  }

  /**
   * Start a shift
   */
  async startShift(shiftId: string) {
    try {
      const shift = await storage.updateShift(shiftId, {
        status: 'active',
        actual_start_at: new Date()
      });
      
      if (!shift) {
        throw new Error("Shift not found");
      }
      
      // Get employee to invalidate company cache
      const employee = await storage.getEmployee(shift.employee_id);
      if (employee) {
        cache.delete(`company:${employee.company_id}:stats`);
      }
      
      logger.info("Shift started", { 
        shiftId, 
        employeeId: shift.employee_id,
        actualStartAt: shift.actual_start_at 
      });
      
      return shift;
    } catch (error) {
      logger.error("Failed to start shift", error);
      throw error;
    }
  }

  /**
   * End a shift
   */
  async endShift(shiftId: string) {
    try {
      const shift = await storage.updateShift(shiftId, {
        status: 'completed',
        actual_end_at: new Date()
      });
      
      if (!shift) {
        throw new Error("Shift not found");
      }
      
      // Get employee to invalidate company cache
      const employee = await storage.getEmployee(shift.employee_id);
      if (employee) {
        cache.delete(`company:${employee.company_id}:stats`);
      }
      
      logger.info("Shift ended", { 
        shiftId, 
        employeeId: shift.employee_id,
        actualEndAt: shift.actual_end_at 
      });
      
      return shift;
    } catch (error) {
      logger.error("Failed to end shift", error);
      throw error;
    }
  }

  /**
   * Start a work interval
   */
  async startWorkInterval(shiftId: string) {
    try {
      const workInterval: InsertWorkInterval = {
        shift_id: shiftId,
        start_at: new Date()
      };

      const interval = await storage.createWorkInterval(workInterval);
      
      logger.info("Work interval started", { 
        shiftId, 
        intervalId: interval.id
      });
      
      return interval;
    } catch (error) {
      logger.error("Failed to start work interval", error);
      throw error;
    }
  }

  /**
   * End a work interval
   */
  async endWorkInterval(intervalId: string) {
    try {
      const interval = await storage.updateWorkInterval(intervalId, {
        end_at: new Date()
      });
      
      logger.info("Work interval ended", { intervalId });
      
      return interval;
    } catch (error) {
      logger.error("Failed to end work interval", error);
      throw error;
    }
  }

  /**
   * Start a break
   */
  async startBreak(shiftId: string, breakType: 'lunch' | 'short' = 'short') {
    try {
      const breakInterval: InsertBreakInterval = {
        shift_id: shiftId,
        start_at: new Date(),
        type: breakType
      };

      const interval = await storage.createBreakInterval(breakInterval);
      
      logger.info("Break started", { 
        shiftId, 
        intervalId: interval.id,
        breakType 
      });
      
      return interval;
    } catch (error) {
      logger.error("Failed to start break", error);
      throw error;
    }
  }

  /**
   * End a break
   */
  async endBreak(intervalId: string) {
    try {
      const interval = await storage.updateBreakInterval(intervalId, {
        end_at: new Date()
      });
      
      logger.info("Break ended", { intervalId });
      
      return interval;
    } catch (error) {
      logger.error("Failed to end break", error);
      throw error;
    }
  }

  /**
   * Get all work intervals for a shift
   */
  async getWorkIntervals(shiftId: string) {
    try {
      const intervals = await storage.getWorkIntervalsByShift(shiftId);
      
      logger.debug("Work intervals fetched", { shiftId, count: intervals.length });
      
      return intervals;
    } catch (error) {
      logger.error("Failed to get work intervals", error);
      throw error;
    }
  }

  /**
   * Get all break intervals for a shift
   */
  async getBreakIntervals(shiftId: string) {
    try {
      const intervals = await storage.getBreakIntervalsByShift(shiftId);
      
      logger.debug("Break intervals fetched", { shiftId, count: intervals.length });
      
      return intervals;
    } catch (error) {
      logger.error("Failed to get break intervals", error);
      throw error;
    }
  }

  /**
   * Get active shifts for a company
   */
  async getActiveShiftsByCompany(companyId: string) {
    try {
      const shifts = await storage.getActiveShiftsByCompany(companyId);
      
      logger.debug("Active shifts fetched", { companyId, count: shifts.length });
      
      return shifts;
    } catch (error) {
      logger.error("Failed to get active shifts", error);
      throw error;
    }
  }

  /**
   * Calculate total work time for a shift (excluding breaks)
   */
  async calculateWorkTime(shiftId: string): Promise<number> {
    try {
      const [workIntervals, breakIntervals] = await Promise.all([
        this.getWorkIntervals(shiftId),
        this.getBreakIntervals(shiftId)
      ]);

      // Calculate total work time in minutes
      let totalWorkMinutes = 0;
      for (const interval of workIntervals) {
        if (interval.end_at) {
          const duration = new Date(interval.end_at).getTime() - new Date(interval.start_at).getTime();
          totalWorkMinutes += duration / (1000 * 60);
        }
      }

      // Subtract break time
      let totalBreakMinutes = 0;
      for (const interval of breakIntervals) {
        if (interval.end_at) {
          const duration = new Date(interval.end_at).getTime() - new Date(interval.start_at).getTime();
          totalBreakMinutes += duration / (1000 * 60);
        }
      }

      const netWorkMinutes = totalWorkMinutes - totalBreakMinutes;
      
      logger.debug("Work time calculated", { 
        shiftId, 
        totalWorkMinutes, 
        totalBreakMinutes, 
        netWorkMinutes 
      });
      
      return Math.max(0, netWorkMinutes);
    } catch (error) {
      logger.error("Failed to calculate work time", error);
      throw error;
    }
  }
}

// Singleton instance
export const shiftService = new ShiftService();

