/**
 * CompanyService - Business logic for company management
 * Separates business logic from HTTP layer
 */

import { storage } from "../storage.js";
import { cache } from "../lib/cache.js";
import { logger } from "../lib/logger.js";
import type { InsertCompany } from "../../shared/schema.js";

export class CompanyService {
  /**
   * Create a new company
   */
  async createCompany(data: InsertCompany) {
    try {
      const company = await storage.createCompany(data);
      
      // Invalidate related caches
      cache.delete(`company:${company.id}:stats`);
      
      logger.info("Company created", { companyId: company.id, name: company.name });
      
      return company;
    } catch (error) {
      logger.error("Failed to create company", error);
      throw error;
    }
  }

  /**
   * Get company by ID
   */
  async getCompany(companyId: string) {
    try {
      const company = await storage.getCompany(companyId);
      
      if (!company) {
        logger.warn("Company not found", { companyId });
        return null;
      }
      
      return company;
    } catch (error) {
      logger.error("Failed to get company", error);
      throw error;
    }
  }

  /**
   * Update company
   */
  async updateCompany(companyId: string, data: Partial<InsertCompany>) {
    try {
      const company = await storage.updateCompany(companyId, data);
      
      // Invalidate related caches
      cache.delete(`company:${companyId}:stats`);
      
      logger.info("Company updated", { companyId });
      
      return company;
    } catch (error) {
      logger.error("Failed to update company", error);
      throw error;
    }
  }

  /**
   * Get company statistics with caching
   */
  async getCompanyStats(companyId: string) {
    const cacheKey = `company:${companyId}:stats`;
    
    // Try cache first
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug("Company stats cache hit", { companyId });
      return cached;
    }

    try {
      const [employees, activeShifts, exceptions] = await Promise.all([
        storage.getEmployeesByCompany(companyId),
        storage.getActiveShiftsByCompany(companyId),
        storage.getExceptionsByCompany(companyId)
      ]);
      
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = activeShifts.filter(shift => 
        shift.planned_start_at.toISOString().split('T')[0] === today
      );
      
      const completedShifts = todayShifts.filter(shift => shift.status === 'completed').length;
      
      const stats = {
        totalEmployees: employees.length,
        activeShifts: activeShifts.length,
        completedShifts,
        exceptions: exceptions.length
      };
      
      // Cache for 2 minutes
      cache.set(cacheKey, stats, 120);
      
      logger.debug("Company stats calculated", { companyId, stats });
      
      return stats;
    } catch (error) {
      logger.error("Failed to calculate company stats", error);
      throw error;
    }
  }

  /**
   * Generate shifts for company employees
   */
  async generateShifts(
    companyId: string,
    startDate: string,
    endDate: string,
    employeeIds?: string[]
  ) {
    try {
      const templates = await storage.getScheduleTemplatesByCompany(companyId);
      
      if (templates.length === 0) {
        throw new Error("No schedule templates found for company");
      }

      const employees = await storage.getEmployeesByCompany(companyId);
      const targetEmployees = employeeIds ? 
        employees.filter(emp => employeeIds.includes(emp.id)) : 
        employees;

      if (targetEmployees.length === 0) {
        throw new Error("No employees found");
      }

      // Optimization: Load all existing shifts at once
      const employeeShiftsMap = new Map();
      await Promise.all(
        targetEmployees.map(async (employee) => {
          const shifts = await storage.getShiftsByEmployee(employee.id);
          employeeShiftsMap.set(employee.id, shifts);
        })
      );

      // Prepare shifts to be created
      const shiftsToCreate = [];
      const template = templates[0];
      const rules = template.rules as any;

      for (const employee of targetEmployees) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const existingShifts = employeeShiftsMap.get(employee.id) || [];
        
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
          const dayOfWeek = date.getDay();
          
          if (rules.workdays && rules.workdays.includes(dayOfWeek)) {
            const shiftStart = new Date(date);
            const [startHour, startMinute] = rules.shift_start.split(':').map(Number);
            shiftStart.setHours(startHour, startMinute, 0, 0);
            
            const shiftEnd = new Date(date);
            const [endHour, endMinute] = rules.shift_end.split(':').map(Number);
            shiftEnd.setHours(endHour, endMinute, 0, 0);
            
            const existingShift = existingShifts.find((s: any) => {
              const shiftDate = new Date(s.planned_start_at);
              shiftDate.setHours(0, 0, 0, 0);
              const checkDate = new Date(date);
              checkDate.setHours(0, 0, 0, 0);
              return shiftDate.getTime() === checkDate.getTime();
            });
            
            if (!existingShift) {
              shiftsToCreate.push({
                employee_id: employee.id,
                planned_start_at: shiftStart,
                planned_end_at: shiftEnd,
                status: 'planned' as const
              });
            }
          }
        }
      }

      // Batch create shifts
      const createdShifts = [];
      for (const shiftData of shiftsToCreate) {
        const shift = await storage.createShift(shiftData);
        createdShifts.push(shift);
      }
      
      // Invalidate cache
      cache.delete(`company:${companyId}:stats`);
      
      logger.info("Shifts generated", { 
        companyId, 
        count: createdShifts.length,
        startDate,
        endDate 
      });
      
      return createdShifts;
    } catch (error) {
      logger.error("Failed to generate shifts", error);
      throw error;
    }
  }
}

// Singleton instance
export const companyService = new CompanyService();

