import { Injectable } from '@nestjs/common';
import { CategoriesService } from '../categories/categories.service';
import { parseIsoDate } from '../common/dates';
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  PaginationMetaDto,
  toPaginationMeta,
} from '../common/dto/pagination.dto';
import {
  BusinessRuleViolationError,
  EntityNotFoundError,
} from '../common/errors/domain.error';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsQuery } from './dto/list-movements.query';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { MovementErrorCode } from './movement-errors';
import type {
  MovementData,
  MovementFilters,
  MovementRecord,
} from './movements.repository';
import { MovementsRepository } from './movements.repository';

@Injectable()
export class MovementsService {
  constructor(
    private readonly movements: MovementsRepository,
    private readonly categories: CategoriesService,
  ) {}

  async create(
    ownerId: string,
    dto: CreateMovementDto,
  ): Promise<MovementRecord> {
    await this.assertCategoryUsable(ownerId, dto.categoryId);

    return this.movements.create(ownerId, this.toData(dto));
  }

  async findAll(
    ownerId: string,
    query: ListMovementsQuery,
  ): Promise<{ data: MovementRecord[]; meta: PaginationMetaDto }> {
    const page = query.page ?? DEFAULT_PAGE;
    const perPage = query.perPage ?? DEFAULT_PER_PAGE;

    const { data, total } = await this.movements.findPage(
      ownerId,
      this.toFilters(query),
      page,
      perPage,
    );

    return { data, meta: toPaginationMeta(page, perPage, total) };
  }

  async findOne(ownerId: string, id: string): Promise<MovementRecord> {
    const movement = await this.movements.findById(ownerId, id);

    if (!movement) {
      throw this.notFound();
    }

    return movement;
  }

  async update(
    ownerId: string,
    id: string,
    dto: UpdateMovementDto,
  ): Promise<MovementRecord> {

    if (dto.categoryId !== undefined) {
      await this.assertCategoryUsable(ownerId, dto.categoryId);
    }

    const updated = await this.movements.update(ownerId, id, {
      ...(dto.type === undefined ? {} : { type: dto.type }),
      ...(dto.amount === undefined ? {} : { amount: dto.amount }),
      ...(dto.description === undefined
        ? {}
        : { description: dto.description }),
      ...(dto.occurredAt === undefined
        ? {}
        : { occurredAt: parseIsoDate(dto.occurredAt) }),
      ...(dto.categoryId === undefined ? {} : { categoryId: dto.categoryId }),
    });

    if (!updated) {
      throw this.notFound();
    }

    return updated;
  }

  async remove(ownerId: string, id: string): Promise<void> {
    const deleted = await this.movements.delete(ownerId, id);

    if (!deleted) {
      throw this.notFound();
    }
  }

  private toData(dto: CreateMovementDto): MovementData {
    return {
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      occurredAt: parseIsoDate(dto.occurredAt),
      categoryId: dto.categoryId,
    };
  }

  private toFilters(query: ListMovementsQuery): MovementFilters {
    if (query.from && query.to && query.from > query.to) {
      throw new BusinessRuleViolationError(
        MovementErrorCode.INVALID_PERIOD,
        'O inicio do periodo nao pode ser posterior ao fim.',
        [{ field: 'from', message: 'Deve ser anterior ou igual a `to`.' }],
      );
    }

    return {
      ...(query.type ? { type: query.type } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.from ? { from: parseIsoDate(query.from) } : {}),
      ...(query.to ? { to: parseIsoDate(query.to) } : {}),
    };
  }

  private async assertCategoryUsable(
    ownerId: string,
    categoryId: string,
  ): Promise<void> {
    const category = await this.categories.findById(ownerId, categoryId);

    if (!category) {
      throw new BusinessRuleViolationError(
        MovementErrorCode.CATEGORY_NOT_FOUND,
        'Categoria nao encontrada.',
        [{ field: 'categoryId', message: 'Categoria nao encontrada.' }],
      );
    }

    if (category.archivedAt !== null) {
      throw new BusinessRuleViolationError(
        MovementErrorCode.CATEGORY_ARCHIVED,
        'Esta categoria esta arquivada e nao aceita novos lancamentos.',
        [
          {
            field: 'categoryId',
            message: 'Categoria arquivada. Reative-a para usá-la.',
          },
        ],
      );
    }
  }

  private notFound(): EntityNotFoundError {
    return new EntityNotFoundError(
      MovementErrorCode.MOVEMENT_NOT_FOUND,
      'Movimentacao nao encontrada.',
    );
  }
}
