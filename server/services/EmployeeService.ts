/**
 * EmployeeService - Business logic for employee management
 */

import type { DIContainer } from "../lib/di/container.js";
import { getContainer } from "../lib/di/container.js";
import { invalidateCompanyStatsByEmployeeId } from "../lib/utils/cache.js";
import { logger } from "../lib/logger.js";
import type { InsertEmployee } from "../../shared/schema.js";

export class EmployeeService {
  constructor(private readonly container: DIContainer) {}

  private get repositories() {
    return this.container.repositories;
  }
  /**
   * Create a new employee
   */
  async createEmployee(data: InsertEmployee) {
    try {
      const employee = await this.repositories.employee.create(data);
      
      // Invalidate company stats cache
      await invalidateCompanyStatsByEmployeeId(employee.id);
      
      logger.info("Employee created", { 
        employeeId: employee.id, 
        companyId: employee.company_id,
        fullName: employee.full_name, 
      });
      
      return employee;
    } catch (error) {
      logger.error("Failed to create employee", error);
      throw error;
    }
  }

  /**
   * Get employee by ID
   */
  async getEmployee(employeeId: string) {
    try {
      const employee = await this.repositories.employee.findById(employeeId);
      
      if (!employee) {
        logger.warn("Employee not found", { employeeId });
        return null;
      }
      
      return employee;
    } catch (error) {
      logger.error("Failed to get employee", error);
      throw error;
    }
  }

  /**
   * Get employee by Telegram ID
   */
  async getEmployeeByTelegramId(telegramId: string) {
    try {
      const employee = await this.repositories.employee.findByTelegramId(telegramId);
      
      if (!employee) {
        logger.warn("Employee not found by Telegram ID", { telegramId });
        return null;
      }
      
      return employee;
    } catch (error) {
      logger.error("Failed to get employee by Telegram ID", error);
      throw error;
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(employeeId: string, data: Partial<InsertEmployee>) {
    try {
      const employee = await this.repositories.employee.update(employeeId, data);
      
      // Invalidate company stats cache if employee changed
      if (employee) {
        await invalidateCompanyStatsByEmployeeId(employee.id);
      }
      
      logger.info("Employee updated", { employeeId });
      
      return employee;
    } catch (error) {
      logger.error("Failed to update employee", error);
      throw error;
    }
  }

  /**
   * Deactivate employee (soft delete)
   */
  async deactivateEmployee(employeeId: string) {
    try {
      const employee = await this.repositories.employee.findById(employeeId);
      
      if (!employee) {
        throw new Error("Employee not found");
      }
      
      await this.repositories.employee.update(employeeId, { status: "inactive" } as any);
      
      // Invalidate company stats cache
      await invalidateCompanyStatsByEmployeeId(employee.id);
      
      logger.info("Employee deactivated", { employeeId, companyId: employee.company_id });
      
      return true;
    } catch (error) {
      logger.error("Failed to deactivate employee", error);
      throw error;
    }
  }

  /**
   * Get all employees for a company
   */
  async getEmployeesByCompany(companyId: string) {
    try {
      const employees = await this.repositories.employee.findByCompanyId(companyId);
      
      logger.debug("Employees fetched", { companyId, count: employees.length });
      
      return employees;
    } catch (error) {
      logger.error("Failed to get employees by company", error);
      throw error;
    }
  }

  /**
   * Link employee to Telegram account
   */
  async linkTelegramAccount(employeeId: string, telegramUserId: string) {
    try {
      const employee = await this.repositories.employee.update(employeeId, {
        telegram_user_id: telegramUserId,
      });
      
      logger.info("Telegram account linked", { 
        employeeId, 
        telegramUserId,
      });
      
      return employee;
    } catch (error) {
      logger.error("Failed to link Telegram account", error);
      throw error;
    }
  }

  /**
   * Unlink employee from Telegram account
   */
  async unlinkTelegramAccount(employeeId: string) {
    try {
      const employee = await this.repositories.employee.update(employeeId, {
        telegram_user_id: null,
      });
      
      logger.info("Telegram account unlinked", { employeeId });
      
      return employee;
    } catch (error) {
      logger.error("Failed to unlink Telegram account", error);
      throw error;
    }
  }

  /**
   * Get employee shifts
   */
  async getEmployeeShifts(employeeId: string) {
    try {
      const shifts = await this.repositories.shift.findByEmployeeId(employeeId);
      
      logger.debug("Employee shifts fetched", { employeeId, count: shifts.length });
      
      return shifts;
    } catch (error) {
      logger.error("Failed to get employee shifts", error);
      throw error;
    }
  }

  /**
   * Get employee's current active shift
   */
  async getActiveShift(employeeId: string) {
    try {
      const shifts = await this.repositories.shift.findByEmployeeId(employeeId);
      const now = new Date();
      
      const activeShift = shifts.find(shift => 
        shift.status === "active" ||
        (shift.status === "planned" && 
         new Date(shift.planned_start_at) <= now &&
         new Date(shift.planned_end_at) >= now),
      );
      
      if (activeShift) {
        logger.debug("Active shift found", { employeeId, shiftId: activeShift.id });
      }
      
      return activeShift || null;
    } catch (error) {
      logger.error("Failed to get active shift", error);
      throw error;
    }
  }
}

// Singleton instance (backward compatibility)
export const employeeService = new EmployeeService(getContainer());

