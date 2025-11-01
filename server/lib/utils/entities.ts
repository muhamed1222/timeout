/**
 * Entity utility functions
 * Common operations for working with entities
 */

import { NotFoundError, ForbiddenError } from '../errorHandler.js';

/**
 * Find entity or throw NotFoundError
 * Reduces duplication of find-or-throw pattern
 */
export async function findOrThrow<T>(
  findFn: () => Promise<T | null>,
  entityName: string
): Promise<T> {
  const entity = await findFn();
  if (!entity) {
    throw new NotFoundError(entityName);
  }
  return entity;
}

/**
 * Validate company scope for entities
 * Ensures employee and other entity belong to the same company
 */
export function validateCompanyScope(
  entity1CompanyId: string,
  entity2CompanyId: string,
  message: string = 'Company scope mismatch'
): void {
  if (entity1CompanyId !== entity2CompanyId) {
    throw new ForbiddenError(message);
  }
}

