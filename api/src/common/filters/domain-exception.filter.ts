import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { buildErrorResponse } from '../dto/error-response.dto';
import {
  BusinessRuleViolationError,
  ConflictError,
  DomainError,
  EntityNotFoundError,
  UnauthenticatedError,
} from '../errors/domain.error';

type DomainErrorClass = new (...args: never[]) => DomainError;

const STATUS_BY_ERROR: ReadonlyArray<readonly [DomainErrorClass, HttpStatus]> =
  [
    [EntityNotFoundError, HttpStatus.NOT_FOUND],
    [ConflictError, HttpStatus.CONFLICT],
    [BusinessRuleViolationError, HttpStatus.UNPROCESSABLE_ENTITY],
    [UnauthenticatedError, HttpStatus.UNAUTHORIZED],
  ];

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter<DomainError> {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const statusCode =
      STATUS_BY_ERROR.find(
        ([errorClass]) => exception instanceof errorClass,
      )?.[1] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    void reply.status(statusCode).send(
      buildErrorResponse({
        statusCode,
        code: exception.code,
        message: exception.message,
        details: exception.details,
        correlationId: request.id,
        path: request.url,
      }),
    );
  }
}
