/**
 * Service factory functions
 * Creates service instances with dependency injection
 */

import { getContainer } from "./container.js";
import { CompanyService } from "../../services/CompanyService.js";
import { EmployeeService } from "../../services/EmployeeService.js";
import { ShiftService } from "../../services/ShiftService.js";
import { RatingService } from "../../services/RatingService.js";

/**
 * Get CompanyService instance with DI
 */
export function getCompanyService(): CompanyService {
  return new CompanyService(getContainer());
}

/**
 * Get EmployeeService instance with DI
 */
export function getEmployeeService(): EmployeeService {
  return new EmployeeService(getContainer());
}

/**
 * Get ShiftService instance with DI
 */
export function getShiftService(): ShiftService {
  return new ShiftService(getContainer());
}

/**
 * Get RatingService instance with DI
 */
export function getRatingService(): RatingService {
  return new RatingService(getContainer());
}



