import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({
    example: 'amount',
    description: 'Field that caused the error.',
  })
  field!: string;

  @ApiProperty({ example: 'amount must be bigger than zero.' })
  message!: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 409 })
  statusCode!: number;

  @ApiProperty({
    example: 'CATEGORY_ALREADY_EXISTS',
    description:
      'Stable code for programmatic decisions. Branch on this field, never on `message`.',
  })
  code!: string;

  @ApiProperty({
    example: 'That category name already exists.',
    description: 'Subject to change without notice.',
  })
  message!: string;

  @ApiPropertyOptional({
    type: [ErrorDetailDto],
    description:
      'Present on validation failures, so the form can highlight the offending field.',
  })
  details?: ErrorDetailDto[];

  @ApiProperty({
    example: 'req-01J8X2K9',
    description: 'Correlates this response with the matching log entry.',
  })
  correlationId!: string;

  @ApiProperty({ example: '2026-08-08T14:22:31.000Z' })
  timestamp!: string;

  @ApiProperty({ example: '/categories' })
  path!: string;
}

export interface BuildErrorResponseParams {
  statusCode: number;
  code: string;
  message: string;
  details?: ErrorDetailDto[];
  correlationId: string;
  path: string;
}

export function buildErrorResponse(
  params: BuildErrorResponseParams,
): ErrorResponseDto {
  return {
    statusCode: params.statusCode,
    code: params.code,
    message: params.message,
    ...(params.details?.length ? { details: params.details } : {}),
    correlationId: params.correlationId,
    timestamp: new Date().toISOString(),
    path: params.path,
  };
}
