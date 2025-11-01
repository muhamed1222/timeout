// Экспорт всех сервисов

export { ShiftService } from './ShiftService.js';
export { CompanyService } from './CompanyService.js';
export { EmployeeService } from './EmployeeService.js';
export { RatingService } from './RatingService.js';

// Export service factories for DI usage
export { getCompanyService, getEmployeeService, getShiftService, getRatingService } from '../lib/di/services.js';
