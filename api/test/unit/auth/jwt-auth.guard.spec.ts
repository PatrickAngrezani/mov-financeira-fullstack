import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '@src/common/decorators/public.decorator';
import { UnauthenticatedError } from '@src/common/errors/domain.error';
import { AuthErrorCode } from '@src/auth/auth-errors';
import { JwtAuthGuard } from '@src/auth/jwt-auth.guard';

const USER_ID = '0195e2a1-7f3c-7c2e-9b4d-3f1a2b3c4d5e';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  const jwt = { verifyAsync: jest.fn() };

  const contextFor = (
    request: Partial<FastifyRequest> & { headers: Record<string, unknown> },
  ): { context: ExecutionContext; request: typeof request } => ({
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => function handler(): void {},
      getClass: () => class Controller {},
    } as unknown as ExecutionContext,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector, jwt as unknown as JwtService);
  });

  describe('extracao do header Authorization', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    });

    it.each([
      ['header ausente', undefined],
    ])('rejeita com MISSING_TOKEN: %s', async (_caso, authorization) => {
      const { context } = contextFor({ headers: { authorization } });

      const error = (await guard
        .canActivate(context)
        .catch((caught: unknown) => caught)) as UnauthenticatedError;

      expect(error).toBeInstanceOf(UnauthenticatedError);
      expect(error.code).toBe(AuthErrorCode.MISSING_TOKEN);
      expect(jwt.verifyAsync).not.toHaveBeenCalled();
    });
  });

  describe('verificacao do token', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    });

    const withToken = (): ExecutionContext =>
      contextFor({ headers: { authorization: 'Bearer o-token' } }).context;

    it('distingue token expirado de token invalido', async () => {
      const expired = new Error('jwt expired');
      expired.name = 'TokenExpiredError';
      jwt.verifyAsync.mockRejectedValueOnce(expired);

      const error = (await guard
        .canActivate(withToken())
        .catch((caught: unknown) => caught)) as UnauthenticatedError;

      expect(error.code).toBe(AuthErrorCode.TOKEN_EXPIRED);
    });

    it.each([
      ['assinatura invalida', 'JsonWebTokenError'],
      ['algoritmo nao permitido', 'JsonWebTokenError'],
      ['erro desconhecido', 'Error'],
    ])('devolve INVALID_TOKEN para %s', async (_caso, errorName) => {
      const rejected = new Error('falhou');
      rejected.name = errorName;
      jwt.verifyAsync.mockRejectedValueOnce(rejected);

      const error = (await guard
        .canActivate(withToken())
        .catch((caught: unknown) => caught)) as UnauthenticatedError;

      expect(error.code).toBe(AuthErrorCode.INVALID_TOKEN);
    });
  });
});
