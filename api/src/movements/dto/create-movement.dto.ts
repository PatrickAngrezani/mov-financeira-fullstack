import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ISO_DATE } from '../../common/dates';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';
import { trimmed } from '../../common/transforms';
import { MovementType } from '../../generated/prisma/enums';

export const DESCRIPTION_MAX = 255;
export const AMOUNT_FORMAT = /^\d{1,12}(\.\d{1,2})?$/;

export class CreateMovementDto {
  @ApiProperty({ enum: MovementType, example: MovementType.EXPENSE })
  @IsEnum(MovementType, {
    message: 'type deve ser INCOME ou EXPENSE.',
  })
  type!: MovementType;

  @ApiProperty({
    example: '99.90',
    description:
      'Positive decimal as text, up to 2 places.',
  })
  @IsString()
  @Matches(AMOUNT_FORMAT, {
    message:
      'amount deve ser decimal positivo com no maximo 2 casas (ex.: 1234.56).',
  })
  @Matches(/[1-9]/, { message: 'amount deve ser maior que zero.' })
  amount!: string;

  @ApiProperty({ example: 'Assinatura mensal', maxLength: DESCRIPTION_MAX })
  @IsString()
  @Transform(trimmed)
  @IsNotEmpty({ message: 'description nao pode ser vazia.' })
  @Length(1, DESCRIPTION_MAX, {
    message: `description deve ter no maximo ${DESCRIPTION_MAX} caracteres.`,
  })
  description!: string;

  @ApiProperty({
    example: '2026-08-10',
    description:
      'Accounting date, with no time and no timezone. The column is a plain DATE in Postgres.',
  })
  @Matches(ISO_DATE, {
    message: 'occurredAt deve estar no formato YYYY-MM-DD.',
  })
  @IsDateString(
    { strict: true },
    { message: 'occurredAt deve ser uma data valida.' },
  )
  occurredAt!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID(undefined, { message: 'categoryId deve ser um uuid valido.' })
  categoryId!: string;
}
