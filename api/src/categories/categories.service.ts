import { Injectable } from '@nestjs/common';
import { EntityNotFoundError } from '../common/errors/domain.error';
import { CategoryErrorCode } from './category-errors';
import type { CategoryRecord } from './categories.repository';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly categories: CategoriesRepository) {}

  async create(
    ownerId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryRecord> {
    return await this.categories.create(ownerId, {
      name: dto.name,
      color: dto.color ?? null,
    });
  }

  async findAll(
    ownerId: string,
    includeArchived: boolean,
  ): Promise<CategoryRecord[]> {
    return await this.categories.findAll(ownerId, includeArchived);
  }

  async findById(ownerId: string, id: string): Promise<CategoryRecord | null> {
    return await this.categories.findById(ownerId, id);
  }

  async findOneOrFail(ownerId: string, id: string): Promise<CategoryRecord> {
    const category = await this.categories.findById(ownerId, id);

    if (!category) {
      throw this.notFound();
    }

    return category;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryRecord> {
    const updated = await this.categories.update(ownerId, id, {
      ...(dto.name === undefined ? {} : { name: dto.name }),
      ...(dto.color === undefined ? {} : { color: dto.color }),
      ...(dto.archived === undefined
        ? {}
        : { archivedAt: dto.archived ? new Date() : null }),
    });

    if (!updated) {
      throw this.notFound();
    }

    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const deleted = await this.categories.delete(ownerId, id);

    if (!deleted) {
      throw this.notFound();
    }
  }

  private notFound(): EntityNotFoundError {
    return new EntityNotFoundError(
      CategoryErrorCode.CATEGORY_NOT_FOUND,
      'Category not found.',
    );
  }
}
