// Базовый класс для доменных исключений
export abstract class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    // Сохраняем стек вызовов
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details
    };
  }
}

// Исключения для сотрудников
export class EmployeeNotFoundError extends DomainException {
  constructor(employeeId: string) {
    super(`Employee with ID ${employeeId} not found`, 'EMPLOYEE_NOT_FOUND', { employeeId });
  }
}

export class EmployeeAlreadyExistsError extends DomainException {
  constructor(telegramUserId: string) {
    super(`Employee with Telegram ID ${telegramUserId} already exists`, 'EMPLOYEE_ALREADY_EXISTS', { telegramUserId });
  }
}

export class InvalidEmployeeDataError extends DomainException {
  constructor(field: string, value: unknown) {
    super(`Invalid employee data: ${field} = ${value}`, 'INVALID_EMPLOYEE_DATA', { field, value });
  }
}

// Исключения для смен
export class ShiftNotFoundError extends DomainException {
  constructor(shiftId: string) {
    super(`Shift with ID ${shiftId} not found`, 'SHIFT_NOT_FOUND', { shiftId });
  }
}

export class ShiftAlreadyStartedError extends DomainException {
  constructor(shiftId: string) {
    super(`Shift ${shiftId} has already been started`, 'SHIFT_ALREADY_STARTED', { shiftId });
  }
}

export class ShiftNotActiveError extends DomainException {
  constructor(shiftId: string) {
    super(`Shift ${shiftId} is not active`, 'SHIFT_NOT_ACTIVE', { shiftId });
  }
}

export class ActiveShiftExistsError extends DomainException {
  constructor(employeeId: string) {
    super(`Employee ${employeeId} already has an active shift`, 'ACTIVE_SHIFT_EXISTS', { employeeId });
  }
}

// Исключения для рейтингов
export class RatingNotFoundError extends DomainException {
  constructor(ratingId: string) {
    super(`Rating with ID ${ratingId} not found`, 'RATING_NOT_FOUND', { ratingId });
  }
}

export class InvalidRatingScoreError extends DomainException {
  constructor(score: number, minScore: number, maxScore: number) {
    super(`Invalid rating score: ${score}. Must be between ${minScore} and ${maxScore}`, 'INVALID_RATING_SCORE', { score, minScore, maxScore });
  }
}

// Исключения для нарушений
export class ViolationNotFoundError extends DomainException {
  constructor(violationId: string) {
    super(`Violation with ID ${violationId} not found`, 'VIOLATION_NOT_FOUND', { violationId });
  }
}

export class InvalidViolationTypeError extends DomainException {
  constructor(type: string, validTypes: string[]) {
    super(`Invalid violation type: ${type}. Valid types: ${validTypes.join(', ')}`, 'INVALID_VIOLATION_TYPE', { type, validTypes });
  }
}

// Исключения для компаний
export class CompanyNotFoundError extends DomainException {
  constructor(companyId: string) {
    super(`Company with ID ${companyId} not found`, 'COMPANY_NOT_FOUND', { companyId });
  }
}

// Исключения для валидации
export class ValidationError extends DomainException {
  constructor(field: string, message: string, value?: unknown) {
    super(`Validation error for field '${field}': ${message}`, 'VALIDATION_ERROR', { field, message, value });
  }
}

// Исключения для аутентификации
export class AuthenticationError extends DomainException {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends DomainException {
  constructor(resource: string, action: string) {
    super(`Access denied to ${action} ${resource}`, 'AUTHORIZATION_ERROR', { resource, action });
  }
}



