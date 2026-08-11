import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { buildErrorResponse } from '../dto/error-response.dto';
import { ErrorCode } from '../errors/error-codes';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const reply = ctx.getResponse<FastifyReply>();

    this.logger.error(
      {
        err: exception,
        correlationId: request.id,
        method: request.method,
        path: request.url,
      },
      'Excecao nao tratada',
    );

    void reply.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
      buildErrorResponse({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: ErrorCode.INTERNAL_ERROR,
        message:
          'Erro interno no servidor. Use o correlationId ao reportar o problema.',
        correlationId: request.id,
        path: request.url,
      }),
    );
  }
}
