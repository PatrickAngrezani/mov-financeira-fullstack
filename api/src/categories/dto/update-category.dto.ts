import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { booleanFromQuery, trimmed } from '../../common/transforms';
import { CATEGORY_NAME_MAX, HEX_COLOR } from './create-category.dto';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Subscriptions',
    maxLength: CATEGORY_NAME_MAX,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty({ message: 'name cannot be empty.' })
  @Length(1, CATEGORY_NAME_MAX, {
    message: `name must be at most ${CATEGORY_NAME_MAX} characters long.`,
  })
  name?: string;

  @ApiPropertyOptional({
    example: '#38BDF8',
    pattern: HEX_COLOR.source,
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @Matches(HEX_COLOR, {
    message: 'color must be a six-digit hexadecimal color (e.g. #38BDF8).',
  })
  color?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Archiving removes the category from entry forms without deleting its history. It is the alternative to DELETE when transactions exist.',
  })
  @IsOptional()
  @Transform(booleanFromQuery)
  @IsBoolean({ message: 'archived must be true or false.' })
  archived?: boolean;
}
