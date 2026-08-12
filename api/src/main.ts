import helmet from '@fastify/helmet';
import { NestFactory } from '@nestjs/core';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { SWAGGER_PATH, createFastifyAdapter, setupSwagger } from './http.setup';

async function bootstrap(): Promise<void> {
  const adapter = createFastifyAdapter();

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    {
      logger: false,
      abortOnError: false,
    },
  );
  const config = app.get(AppConfigService);

  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  app.enableShutdownHooks();

  if (config.corsOrigins.length > 0) {
    app.enableCors({ origin: config.corsOrigins, credentials: true });
  }

  if (config.swaggerEnabled) {
    setupSwagger(app);
  }

  await app.listen(config.port, '0.0.0.0');

  const logger = app.get(Logger);
  logger.log(`API no ar em http://localhost:${config.port}`);
  if (config.swaggerEnabled) {
    logger.log(`Swagger em http://localhost:${config.port}/${SWAGGER_PATH}`);
  }
}

void bootstrap().catch((error: unknown) => {
  console.error('[bootstrap] failed to start the API:', error);
  process.exit(1);
});
