import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validationExceptionFactory } from './common/pipes/validation-exception.factory';
import { AppConfigModule } from './config/app-config.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';
import { MovementsModule } from './movements/movements.module';
import { PrismaModule } from './prisma/prisma.module';

const GLOBAL_RATE_LIMIT = { ttl: 60_000, limit: 100 };

@Module({
  imports: [
    AppConfigModule,
    LoggingModule,
    PrismaModule,
    ThrottlerModule.forRoot([GLOBAL_RATE_LIMIT]),
    HealthModule,
    AuthModule,
    CategoriesModule,
    MovementsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
          enableImplicitConversion: false,
        },
        exceptionFactory: validationExceptionFactory,
      }),
    },
  ],
})
export class AppModule {}
