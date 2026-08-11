import { ApiProperty } from '@nestjs/swagger';
import type { CategoryRecord } from '../categories.repository';

export class CategoryDto {
  @ApiProperty({
    example: '0195e2a1-7f3c-7c2e-9b4d-3f1a2b3c4d5e',
    format: 'uuid',
  })
  id!: string;

  @ApiProperty({ example: 'Assinaturas' })
  name!: string;

  @ApiProperty({ example: '#38BDF8', nullable: true })
  color!: string | null;

  @ApiProperty({
    example: false,
    description:
      'An archived category disappears from the entry forms but stays in the history.',
  })
  archived!: boolean;

  @ApiProperty({ example: '2026-08-10T11:06:35.000Z', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ example: '2026-08-10T11:06:35.000Z', format: 'date-time' })
  updatedAt!: string;
}

export function toCategoryDto(category: CategoryRecord): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    color: category.color,
    archived: category.archivedAt !== null,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}
