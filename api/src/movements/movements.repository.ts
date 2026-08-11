import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MovementType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

interface DecimalLike {
  toFixed(digits: number): string;
}

export interface MovementRecord {
  id: string;
  type: MovementType;
  amount: DecimalLike;
  description: string;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  category: { id: string; name: string; color: string | null };
}

export interface MovementFilters {
  type?: MovementType;
  categoryId?: string;
  from?: Date;
  to?: Date;
}

export interface MovementData {
  type: MovementType;
  amount: string;
  description: string;
  occurredAt: Date;
  categoryId: string;
}

const MOVEMENT_SELECT = {
  id: true,
  type: true,
  amount: true,
  description: true,
  occurredAt: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, color: true } },
} as const;

const MOVEMENT_ORDER = [
  { occurredAt: 'desc' },
  { id: 'desc' },
] as const satisfies Prisma.MovementOrderByWithRelationInput[];

@Injectable()
export class MovementsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, data: MovementData): Promise<MovementRecord> {
    return this.prisma.movement.create({
      data: { userId: ownerId, ...data },
      select: MOVEMENT_SELECT,
    });
  }

  async findPage(
    ownerId: string,
    filters: MovementFilters,
    page: number,
    perPage: number,
  ): Promise<{ data: MovementRecord[]; total: number }> {
    const where = this.buildWhere(ownerId, filters);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.movement.findMany({
        where,
        orderBy: MOVEMENT_ORDER,
        skip: (page - 1) * perPage,
        take: perPage,
        select: MOVEMENT_SELECT,
      }),
      this.prisma.movement.count({ where }),
    ]);

    return { data, total };
  }

  async findById(ownerId: string, id: string): Promise<MovementRecord | null> {
    return await this.prisma.movement.findFirst({
      where: { id, userId: ownerId },
      select: MOVEMENT_SELECT,
    });
  }

  async update(
    ownerId: string,
    id: string,
    changes: Partial<MovementData>,
  ): Promise<MovementRecord | null> {
    const { count } = await this.prisma.movement.updateMany({
      where: { id, userId: ownerId },
      data: changes,
    });

    return count === 0 ? null : this.findById(ownerId, id);
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.movement.deleteMany({
      where: { id, userId: ownerId },
    });

    return count > 0;
  }

  private buildWhere(
    ownerId: string,
    filters: MovementFilters,
  ): Prisma.MovementWhereInput {
    return {
      userId: ownerId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.from || filters.to
        ? {
            occurredAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };
  }
}
