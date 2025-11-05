/**
 * Dependency Injection Container
 *
 * Simple DI container for managing dependencies and reducing coupling.
 * Provides constructor injection for services and repositories.
 */

import type { CompanyRepository } from "../../repositories/CompanyRepository.js";
import type { EmployeeRepository } from "../../repositories/EmployeeRepository.js";
import type { RatingRepository } from "../../repositories/RatingRepository.js";
import type { ViolationRepository } from "../../repositories/ViolationRepository.js";
import type { ShiftRepository } from "../../repositories/ShiftRepository.js";
import type { ExceptionRepository } from "../../repositories/ExceptionRepository.js";
import type { ScheduleRepository } from "../../repositories/ScheduleRepository.js";
import type { InviteRepository } from "../../repositories/InviteRepository.js";
import type { ReminderRepository } from "../../repositories/ReminderRepository.js";
import type { AuditRepository } from "../../repositories/AuditRepository.js";

/**
 * Container for all dependencies
 */
export interface DIContainer {
  repositories: {
    company: CompanyRepository;
    employee: EmployeeRepository;
    rating: RatingRepository;
    violation: ViolationRepository;
    shift: ShiftRepository;
    exception: ExceptionRepository;
    schedule: ScheduleRepository;
    invite: InviteRepository;
    reminder: ReminderRepository;
    audit: AuditRepository;
  };
}

/**
 * Global DI container instance
 * Initialized on startup
 */
let container: DIContainer | null = null;

/**
 * Initialize the DI container with dependencies
 */
export function createContainer(dependencies: DIContainer): DIContainer {
  container = dependencies;
  return container;
}

/**
 * Get the DI container instance
 * Throws if container is not initialized
 */
export function getContainer(): DIContainer {
  if (!container) {
    throw new Error(
      "DI Container not initialized. Call createContainer() first.",
    );
  }
  return container;
}

/**
 * Reset the container (useful for testing)
 */
export function resetContainer(): void {
  container = null;
}
