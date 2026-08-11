import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { ISO_DATE } from '../../common/dates';
import { PaginationQuery } from '../../common/dto/pagination.dto';
import { MovementType } from '../../generated/prisma/enums';

export class ListMovementsQuery extends PaginationQuery {
  @ApiPropertyOptional({ enum: MovementType })
  @IsOptional()
  @IsEnum(MovementType, { message: 'type deve ser INCOME ou EXPENSE.' })
  type?: MovementType;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID(undefined, { message: 'categoryId deve ser um uuid valido.' })
  categoryId?: string;

  @ApiPropertyOptional({
    example: '2026-08-01',
    description: 'Inicio do periodo, inclusivo.',
  })
  @IsOptional()
  @Matches(ISO_DATE, {
    message: 'from deve estar no formato YYYY-MM-DD.',
  })
  @IsDateString({ strict: true }, { message: 'from deve ser uma data valida.' })
  from?: string;

  @ApiPropertyOptional({
    example: '2026-08-31',
    description: 'Fim do periodo, inclusivo.',
  })
  @IsOptional()
  @Matches(ISO_DATE, {
    message: 'to deve estar no formato YYYY-MM-DD.',
  })
  @IsDateString({ strict: true }, { message: 'to deve ser uma data valida.' })
  to?: string;
}
