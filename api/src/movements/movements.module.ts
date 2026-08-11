import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { MovementsController } from './movements.controller';
import { MovementsRepository } from './movements.repository';
import { MovementsService } from './movements.service';

@Module({
  imports: [CategoriesModule],
  controllers: [MovementsController],
  providers: [MovementsService, MovementsRepository],
  exports: [MovementsService],
})
export class MovementsModule {}
