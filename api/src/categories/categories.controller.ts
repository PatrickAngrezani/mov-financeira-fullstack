import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  ApiAuthenticated,
  ApiErrors,
} from '../common/decorators/api-errors.decorator';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import { CategoryDto, toCategoryDto } from './dto/category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { ListCategoriesQuery } from './dto/list-categories.query';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoriesService } from './categories.service';

const UuidParam = (): ParameterDecorator => Param('id', new ParseUUIDPipe());

@ApiTags('Categories')
@ApiAuthenticated()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Creates a category for the authenticated user' })
  @ApiCreatedResponse({ type: CategoryDto })
  @ApiErrors({
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.CONFLICT]: 'CATEGORY_ALREADY_EXISTS',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCategoryDto,
  ): Promise<CategoryDto> {
    return toCategoryDto(await this.categories.create(user.id, dto));
  }

  @Get()
  @ApiOperation({
    summary: 'Lists the categories of the authenticated user',
    description:
      'Active first, archived last, both alphabetically. Archived ones only show up with includeArchived=true.',
  })
  @ApiOkResponse({ type: [CategoryDto] })
  @ApiErrors({ [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCategoriesQuery,
  ): Promise<CategoryDto[]> {
    const categories = await this.categories.findAll(
      user.id,
      query.includeArchived ?? false,
    );

    return categories.map(toCategoryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Returns a single category',
    description:
      "Another user's category returns 404, never 403 — a 403 would confirm the id exists.",
  })
  @ApiOkResponse({ type: CategoryDto })
  @ApiErrors({ [HttpStatus.NOT_FOUND]: 'CATEGORY_NOT_FOUND' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @UuidParam() id: string,
  ): Promise<CategoryDto> {
    return toCategoryDto(await this.categories.findOneOrFail(user.id, id));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Updates name, color or archived state',
    description:
      'Every field is optional. archived: true archives it; archived: false brings it back.',
  })
  @ApiOkResponse({ type: CategoryDto })
  @ApiErrors({
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.NOT_FOUND]: 'CATEGORY_NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CATEGORY_ALREADY_EXISTS',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @UuidParam() id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return toCategoryDto(await this.categories.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletes a category that has no movements',
    description:
      'A category with movements returns 409 CATEGORY_IN_USE: deleting it would orphan those entries. The way out is to archive it instead (PATCH with archived: true).',
  })
  @ApiNoContentResponse()
  @ApiErrors({
    [HttpStatus.NOT_FOUND]: 'CATEGORY_NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CATEGORY_IN_USE',
  })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @UuidParam() id: string,
  ): Promise<void> {
    return this.categories.remove(user.id, id);
  }
}
