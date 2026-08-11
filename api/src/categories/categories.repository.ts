import { Injectable } from '@nestjs/common';
import { ConflictError } from '../common/errors/domain.error';
import {
  isForeignKeyViolation,
  isRecordNotFound,
  isUniqueViolation,
} from '../prisma/prisma-errors';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryErrorCode } from './category-errors';

export interface CategoryRecord {
  id: string;
  name: string;
  color: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryChanges {
  name?: string;
  color?: string;
  archivedAt?: Date | null;
}

const CATEGORY_SELECT = {
  id: true,
  name: true,
  color: true,
  archivedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

function alreadyExists(): ConflictError {
  return new ConflictError(
    CategoryErrorCode.CATEGORY_ALREADY_EXISTS,
    'This category name already exists.',
    [{ field: 'name', message: 'This category name already exists.' }],
  );
}

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    data: { name: string; color: string | null },
  ): Promise<CategoryRecord> {
    try {
      return await this.prisma.category.create({
        data: { userId: ownerId, ...data },
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      if (isUniqueViolation(error, 'name')) {
        throw alreadyExists();
      }

      throw error;
    }
  }

  async findAll(
    ownerId: string,
    includeArchived: boolean,
  ): Promise<CategoryRecord[]> {
    return await this.prisma.category.findMany({
      where: {
        userId: ownerId,
        ...(includeArchived ? {} : { archivedAt: null }),
      },
      orderBy: [
        { archivedAt: { sort: 'asc', nulls: 'first' } },
        { name: 'asc' },
      ],
      select: CATEGORY_SELECT,
    });
  }

  async findById(ownerId: string, id: string): Promise<CategoryRecord | null> {
    return await this.prisma.category.findUnique({
      where: { id_userId: { id, userId: ownerId } },
      select: CATEGORY_SELECT,
    });
  }

  async update(
    ownerId: string,
    id: string,
    changes: CategoryChanges,
  ): Promise<CategoryRecord | null> {
    try {
      return await this.prisma.category.update({
        where: { id_userId: { id, userId: ownerId } },
        data: changes,
        select: CATEGORY_SELECT,
      });
    } catch (error) {
      if (isRecordNotFound(error)) {
        return null;
      }

      if (isUniqueViolation(error, 'name')) {
        throw alreadyExists();
      }

      throw error;
    }
  }

  async delete(ownerId: string, id: string): Promise<boolean> {
    try {
      await this.prisma.category.delete({
        where: { id_userId: { id, userId: ownerId } },
      });

      return true;
    } catch (error) {
      if (isRecordNotFound(error)) {
        return false;
      }

      if (isForeignKeyViolation(error)) {
        throw new ConflictError(
          CategoryErrorCode.CATEGORY_IN_USE,
          'Esta categoria possui movimentacoes e nao pode ser excluida. Arquive-a para retirá-la dos formularios preservando o historico.',
        );
      }

      throw error;
    }
  }
}
