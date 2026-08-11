import { HttpStatus, applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';

type ErrorCatalog = Partial<Record<HttpStatus, string>>;

type Decorator = MethodDecorator & ClassDecorator;

export const ApiErrors = (catalog: ErrorCatalog): Decorator =>
  applyDecorators(
    ...Object.entries(catalog).map(([status, codes]) =>
      ApiResponse({
        status: Number(status),
        description: codes,
        type: ErrorResponseDto,
      }),
    ),
  );

export const ApiAuthenticated = (): Decorator =>
  applyDecorators(
    ApiBearerAuth('bearer'),
    ApiErrors({
      [HttpStatus.UNAUTHORIZED]:
        'MISSING_TOKEN | INVALID_TOKEN | TOKEN_EXPIRED',
    }),
  );
