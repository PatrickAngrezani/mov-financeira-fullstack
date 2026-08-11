import type { INestApplication } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { ErrorResponseDto } from './common/dto/error-response.dto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const SWAGGER_PATH = 'swagger';

export function createFastifyAdapter(): FastifyAdapter {
  return new FastifyAdapter({
    trustProxy: true,
    genReqId: (req: IncomingMessage) =>
      (req.headers[CORRELATION_ID_HEADER] as string | undefined) ??
      randomUUID(),
  });
}

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Movimentacoes Financeiras API')
    .setDescription(
      [
        'API de controle de movimentacoes financeiras pessoais.',
        '**Autenticacao** — obtenha um token em `POST /auth/login` e informe-o',
        '**Erros** — toda falha usa o mesmo envelope (`ErrorResponseDto`). Trate pelo campo',
        '**Valores monetarios** — trafegam como *string* decimal (ex.: `"100.56"`)',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'bearer',
    )
    .addTag('Health', 'Sondas de liveness e readiness')
    .addTag('Auth', 'Cadastro, login e identidade')
    .addTag('Categories', 'Categorias do usuario autenticado')
    .addTag('Movements', 'Movimentacoes do usuario autenticado')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ErrorResponseDto],
  });

  SwaggerModule.setup(SWAGGER_PATH, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });
}
