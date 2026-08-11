import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { booleanFromQuery } from '../../common/transforms';

export class ListCategoriesQuery {
  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Defaults to false. Excluding archived categories by default prevents archived categories from being accidentally offered when creating a transaction if the parameter is omitted.',
  })
  @IsOptional()
  @Transform(booleanFromQuery)
  @IsBoolean({ message: 'includeArchived must be true or false.' })
  includeArchived?: boolean;
}
