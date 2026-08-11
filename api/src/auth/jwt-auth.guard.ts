import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { UnauthenticatedError } from '../common/errors/domain.error';
import { AuthErrorCode } from './auth-errors';
import './current-user.decorator';

const BEARER_SCHEME = 'bearer';

interface JwtPayload {
  sub: string;
  iat: number;
  exp: number;
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const parts = header.split(' ');

  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;

  if (scheme?.toLowerCase() !== BEARER_SCHEME || !token) {
    return null;
  }

  return token;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic === true) {
      return true;
    }

    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthenticatedError(
        AuthErrorCode.MISSING_TOKEN,
        'Autenticacao obrigatoria. Envie o header Authorization: Bearer <token>.',
      );
    }

    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(token);
    } catch (error) {
      throw this.toAuthError(error);
    }

    request.user = { id: payload.sub };

    return true;
  }

  private toAuthError(error: unknown): UnauthenticatedError {
    const expired =
      error instanceof Error && error.name === 'TokenExpiredError';

    return expired
      ? new UnauthenticatedError(
          AuthErrorCode.TOKEN_EXPIRED,
          'Sessao expirada. Faca login novamente.',
        )
      : new UnauthenticatedError(
          AuthErrorCode.INVALID_TOKEN,
          'Token invalido.',
        );
  }
}
