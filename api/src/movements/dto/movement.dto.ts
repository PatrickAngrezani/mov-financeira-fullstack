import { ApiProperty } from '@nestjs/swagger';
import { formatIsoDate } from '../../common/dates';
import { PaginationMetaDto } from '../../common/dto/pagination.dto';
import { MovementType } from '../../generated/prisma/enums';
import type { MovementRecord } from '../movements.repository';

export class MovementCategoryDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Assinaturas' })
  name!: string;

  @ApiProperty({ example: '#38BDF8', nullable: true })
  color!: string | null;
}

export class MovementDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: MovementType, example: MovementType.EXPENSE })
  type!: MovementType;

  @ApiProperty({
    example: '1234.56',
    description:
      'Decimal string, always with 2 places. Travels as text to stay exact: `JSON.parse` would turn it into IEEE-754.',
  })
  amount!: string;

  @ApiProperty({ example: 'Assinatura mensal' })
  description!: string;

  @ApiProperty({
    example: '2026-08-10',
    description: 'Plain date, no timezone.',
  })
  occurredAt!: string;

  @ApiProperty({ type: MovementCategoryDto })
  category!: MovementCategoryDto;

  @ApiProperty({ example: '2026-08-10T11:06:35.000Z', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-10T11:06:35.000Z', format: 'date-time' })
  updatedAt!: string;
}

export class PaginatedMovementsDto {
  @ApiProperty({ type: [MovementDto] })
  data!: MovementDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export function toMovementDto(movement: MovementRecord): MovementDto {
  return {
    id: movement.id,
    type: movement.type,
    amount: movement.amount.toFixed(2),
    description: movement.description,
    occurredAt: formatIsoDate(movement.occurredAt),
    category: {
      id: movement.category.id,
      name: movement.category.name,
      color: movement.category.color,
    },
    createdAt: movement.createdAt.toISOString(),
    updatedAt: movement.updatedAt.toISOString(),
  };
}
