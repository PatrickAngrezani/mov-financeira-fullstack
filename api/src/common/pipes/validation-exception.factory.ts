import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import type { ErrorDetailDto } from '../dto/error-response.dto';
import { ErrorCode } from '../errors/error-codes';

function flatten(errors: ValidationError[], parentPath = ''): ErrorDetailDto[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;

    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field: path,
      message,
    }));

    const nested = error.children?.length ? flatten(error.children, path) : [];

    return [...own, ...nested];
  });
}

export function validationExceptionFactory(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    code: ErrorCode.VALIDATION_FAILED,
    message: 'Os dados enviados sao invalidos.',
    details: flatten(errors),
  });
}
