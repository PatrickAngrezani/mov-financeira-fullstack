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
  CurrentUser,
  type AuthenticatedUser,
} from '../auth/current-user.decorator';
import {
  ApiAuthenticated,
  ApiErrors,
} from '../common/decorators/api-errors.decorator';
import { CreateMovementDto } from './dto/create-movement.dto';
import { ListMovementsQuery } from './dto/list-movements.query';
import {
  MovementDto,
  PaginatedMovementsDto,
  toMovementDto,
} from './dto/movement.dto';
import { UpdateMovementDto } from './dto/update-movement.dto';
import { MovementsService } from './movements.service';

const UuidParam = (): ParameterDecorator => Param('id', new ParseUUIDPipe());

@ApiTags('Movements')
@ApiAuthenticated()
@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  @Post()
  @ApiOperation({
    summary: 'Records a movement',
    description:
      'The amount is always positive; the sign comes from `type`. The category must belong to the user and must not be archived.',
  })
  @ApiCreatedResponse({ type: MovementDto })
  @ApiErrors({
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'CATEGORY_NOT_FOUND | CATEGORY_ARCHIVED',
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMovementDto,
  ): Promise<MovementDto> {
    return toMovementDto(await this.movements.create(user.id, dto));
  }

  @Get()
  @ApiOperation({
    summary: 'Lists movements with filters and pagination',
    description:
      'Fixed ordering: accounting date descending, with the id as tiebreaker so pagination is stable. Filters by type, categoryId and period (from/to, both inclusive).',
  })
  @ApiOkResponse({ type: PaginatedMovementsDto })
  @ApiErrors({
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'INVALID_PERIOD',
  })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListMovementsQuery,
  ): Promise<PaginatedMovementsDto> {
    const { data, meta } = await this.movements.findAll(user.id, query);

    return { data: data.map(toMovementDto), meta };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Returns a single movement',
    description:
      "Another user's movement returns 404, never 403 — a 403 would confirm the id exists.",
  })
  @ApiOkResponse({ type: MovementDto })
  @ApiErrors({ [HttpStatus.NOT_FOUND]: 'MOVEMENT_NOT_FOUND' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @UuidParam() id: string,
  ): Promise<MovementDto> {
    return toMovementDto(await this.movements.findOne(user.id, id));
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Updates a movement',
    description:
      'Every field is optional. The category is validated only when `categoryId` is present in the body, so editing the amount or the description keeps working if the category was archived later.',
  })
  @ApiOkResponse({ type: MovementDto })
  @ApiErrors({
    [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
    [HttpStatus.NOT_FOUND]: 'MOVEMENT_NOT_FOUND',
    [HttpStatus.UNPROCESSABLE_ENTITY]: 'CATEGORY_NOT_FOUND | CATEGORY_ARCHIVED',
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @UuidParam() id: string,
    @Body() dto: UpdateMovementDto,
  ): Promise<MovementDto> {
    return toMovementDto(await this.movements.update(user.id, id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Deletes a movement',
    description:
      'Permanent deletion. Archiving exists only for categories, where deleting would orphan history.',
  })
  @ApiNoContentResponse()
  @ApiErrors({ [HttpStatus.NOT_FOUND]: 'MOVEMENT_NOT_FOUND' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @UuidParam() id: string,
  ): Promise<void> {
    return this.movements.remove(user.id, id);
  }
}
