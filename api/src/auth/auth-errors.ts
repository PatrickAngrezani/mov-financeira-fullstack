import { UnauthenticatedError } from '../common/errors/domain.error';

export const AuthErrorCode = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
} as const;

export function invalidCredentials(): UnauthenticatedError {
  return new UnauthenticatedError(
    AuthErrorCode.INVALID_CREDENTIALS,
    'E-mail ou senha invalidos.',
  );
}
