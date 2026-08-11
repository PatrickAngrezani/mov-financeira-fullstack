import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildErrorResponse,
  type ErrorDetailDto,
} from '../dto/error-response.dto';
import { ErrorCode } from '../errors/error-codes';

const CODE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.ROUTE_NOT_FOUND,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.TOO_MANY_REQUESTS,
};

interface StructuredPayload {
  code?: string;
  message?: string | string[];
  details?: ErrorDetailDto[];
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    const statusCode = exception.getStatus();
    const payload = exception.getResponse();
    const structured: StructuredPayload =
      typeof payload === 'object' && payload !== null
        ? (payload as StructuredPayload)
        : { message: String(payload) };

    const message = Array.isArray(structured.message)
      ? structured.message.join('; ')
      : (structured.message ?? exception.message);

    void reply.status(statusCode).send(
      buildErrorResponse({
        statusCode,
        code:
          structured.code ??
          CODE_BY_STATUS[statusCode] ??
          ErrorCode.INTERNAL_ERROR,
        message,
        details: structured.details,
        correlationId: request.id,
        path: request.url,
      }),
    );
  }
}
