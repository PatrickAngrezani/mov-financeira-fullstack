import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { trimmed } from '../../common/transforms';

export const CATEGORY_NAME_MAX = 60;
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

export class CreateCategoryDto {
  @ApiProperty({ example: 'Subscriptions', maxLength: CATEGORY_NAME_MAX })
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty({ message: 'name cannot be empty.' })
  @Length(1, CATEGORY_NAME_MAX, {
    message: `name must be at most ${CATEGORY_NAME_MAX} characters long.`,
  })
  name!: string;

  @ApiPropertyOptional({
    example: '#38BDF8',
    pattern: HEX_COLOR.source,
    description:
      'Six-digit hexadecimal color. Used by the frontend for the category chip.',
  })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @Matches(HEX_COLOR, {
    message: 'color must be a six-digit hexadecimal color (e.g. #38BDF8).',
  })
  color?: string;
}
