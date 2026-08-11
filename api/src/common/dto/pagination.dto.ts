import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_PAGE = 1;
export const DEFAULT_PER_PAGE = 20;
export const MAX_PER_PAGE = 100;

function integerFromQuery({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string' || !/^-?\d+$/.test(value)) {
    return value;
  }

  return Number.parseInt(value, 10);
}

export class PaginationQuery {
  @ApiPropertyOptional({ minimum: 1, default: DEFAULT_PAGE })
  @IsOptional()
  @Transform(integerFromQuery)
  @IsInt({ message: 'page must be an integer.' })
  @Min(1, { message: 'page must be greater than or equal to 1.' })
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PER_PAGE,
    default: DEFAULT_PER_PAGE,
  })
  @IsOptional()
  @Transform(integerFromQuery)
  @IsInt({ message: 'perPage must be an integer.' })
  @Min(1, { message: 'perPage must be greater than or equal to 1.' })
  @Max(MAX_PER_PAGE, {
    message: `perPage must be at most ${MAX_PER_PAGE}.`,
  })
  perPage?: number;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  perPage!: number;

  @ApiProperty({
    example: 137,
    description: 'Total records matching the filter.',
  })
  total!: number;

  @ApiProperty({ example: 7 })
  totalPages!: number;
}

export function toPaginationMeta(
  page: number,
  perPage: number,
  total: number,
): PaginationMetaDto {
  return {
    page,
    perPage,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / perPage),
  };
}
