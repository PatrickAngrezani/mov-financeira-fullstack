import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ISO_DATE } from '../../common/dates';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { trimmed } from '../../common/transforms';
import { MovementType } from '../../generated/prisma/enums';
import { AMOUNT_FORMAT, DESCRIPTION_MAX } from './create-movement.dto';

export class UpdateMovementDto {
  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType, { message: 'type deve ser INCOME ou EXPENSE.' })
  type?: MovementType;

  @ApiPropertyOptional({ example: '1234.56' })
  @IsOptional()
  @IsString()
  @Matches(AMOUNT_FORMAT, {
    message:
      'amount deve ser decimal positivo com no maximo 2 casas (ex.: 1234.56).',
  })
  @Matches(/[1-9]/, { message: 'amount deve ser maior que zero.' })
  amount?: string;

  @ApiPropertyOptional({ maxLength: DESCRIPTION_MAX })
  @IsOptional()
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty({ message: 'description nao pode ser vazia.' })
  @Length(1, DESCRIPTION_MAX, {
    message: `description deve ter no maximo ${DESCRIPTION_MAX} caracteres.`,
  })
  description?: string;

  @ApiPropertyOptional({ example: '2026-08-10' })
  @IsOptional()
  @Matches(ISO_DATE, {
    message: 'occurredAt deve estar no formato YYYY-MM-DD.',
  })
  @IsDateString(
    { strict: true },
    { message: 'occurredAt deve ser uma data valida.' },
  )
  occurredAt?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'categoryId deve ser um uuid valido.' })
  categoryId?: string;
}
