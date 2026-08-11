import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

export interface AuthenticatedUser {
  id: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<FastifyRequest>();

    if (!request.user) {
      throw new Error(
        '@CurrentUser() usado em rota que nao passa pelo JwtAuthGuard. Verifique se ha um @Public() indevido.',
      );
    }

    return request.user;
  },
);
