import type { ErrorCodeLike } from './error-codes';

export interface ErrorDetail {
  field: string;
  message: string;
}

export abstract class DomainError extends Error {
  constructor(
    readonly code: ErrorCodeLike,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class EntityNotFoundError extends DomainError {}
export class ConflictError extends DomainError {}
export class BusinessRuleViolationError extends DomainError {}
export class UnauthenticatedError extends DomainError {}
