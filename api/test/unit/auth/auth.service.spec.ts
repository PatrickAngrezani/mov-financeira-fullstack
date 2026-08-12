import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { UnauthenticatedError } from '@src/common/errors/domain.error';
import { PasswordHasher } from '@src/crypto/password-hasher.service';
import { AuthErrorCode } from '@src/auth/auth-errors';
import { AuthService } from '@src/auth/auth.service';
import type {
  UserIdentity,
  UserWithCredentials,
} from '@src/users/users.repository';
import { UsersService } from '@src/users/users.service';

const USER: UserIdentity = {
  id: '0195e2a1-7f3c-7c2e-9b4d-3f1a2b3c4d5e',
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  createdAt: new Date('2026-08-08T14:22:31.000Z'),
};

const PASSWORD_HASH = '$argon2id$v=19$m=19456,p=1,t=2$hash-simulado';
const FOUND: UserWithCredentials = { user: USER, passwordHash: PASSWORD_HASH };
const NOW_IN_SECONDS = 1_800_000_000;

describe('AuthService', () => {
  let service: AuthService;

  const users = {
    create: jest.fn<Promise<UserIdentity>, [unknown]>(),
    findById: jest.fn<Promise<UserIdentity | null>, [string]>(),
    findWithCredentials: jest.fn<
      Promise<UserWithCredentials | null>,
      [string]
    >(),
  };

  const hasher = {
    hash: jest.fn<Promise<string>, [string]>(),
    verify: jest.fn<Promise<boolean>, [string, string]>(),
    simulateVerify: jest.fn<Promise<void>, []>(),
  };

  const jwt = {
    signAsync: jest.fn<Promise<string>, [unknown]>(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    jwt.signAsync.mockResolvedValue('token-assinado');
    jwt.decode.mockReturnValue({
      iat: NOW_IN_SECONDS,
      exp: NOW_IN_SECONDS + 3600,
    });
    hasher.simulateVerify.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: PasswordHasher, useValue: hasher },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });   

  describe('login bem-sucedido', () => {
    beforeEach(() => {
      users.findWithCredentials.mockResolvedValue(FOUND);
      hasher.verify.mockResolvedValue(true);
    });

    it('assina o token com apenas o sub, sem nenhum claim de perfil', async () => {
      await service.login({ email: USER.email, password: 'senha-correta' });

      expect(jwt.signAsync).toHaveBeenCalledWith({ sub: USER.id });
    });

    it('resolve o login com uma leitura, sem consultar o usuario de novo', async () => {
      await service.login({ email: USER.email, password: 'senha-correta' });

      expect(users.findWithCredentials).toHaveBeenCalledTimes(1);
      expect(users.findById).not.toHaveBeenCalled();
    });

    it('devolve o envelope de sessao completo', async () => {
      const response = await service.login({
        email: USER.email,
        password: 'senha-correta',
      });

      expect(response).toEqual({
        accessToken: 'token-assinado',
        tokenType: 'Bearer',
        expiresIn: 3600,
        user: {
          id: USER.id,
          name: USER.name,
          email: USER.email,
          createdAt: '2026-08-08T14:22:31.000Z',
        },
      });
    });

    it('nunca expoe passwordHash na resposta', async () => {
      const response = await service.login({
        email: USER.email,
        password: 'senha-correta',
      });

      expect(JSON.stringify(response)).not.toContain(PASSWORD_HASH);
      expect(JSON.stringify(response)).not.toContain('passwordHash');
    });

    it('deriva o expiresIn do token assinado, nao da configuracao', async () => {
      jwt.decode.mockReturnValueOnce({
        iat: NOW_IN_SECONDS,
        exp: NOW_IN_SECONDS + 604_800,
      });

      const response = await service.login({
        email: USER.email,
        password: 'senha-correta',
      });

      expect(response.expiresIn).toBe(604_800);
    });
  });

  describe('register', () => {
    it('devolve token no registro, fazendo auto-login', async () => {
      users.create.mockResolvedValueOnce(USER);

      const response = await service.register({
        name: 'Ana Souza',
        email: 'ana@exemplo.com',
        password: 'senha-em-texto-puro',
      });

      expect(response.accessToken).toBe('token-assinado');
      expect(response.user.id).toBe(USER.id);
    });
  });

  describe('me', () => {
    it('devolve 401, e nao 404, quando o token aponta para conta inexistente', async () => {
      users.findById.mockResolvedValueOnce(null);

      const error = (await service
        .me(USER.id)
        .catch((caught: unknown) => caught)) as UnauthenticatedError;

      expect(error).toBeInstanceOf(UnauthenticatedError);
      expect(error.code).toBe(AuthErrorCode.INVALID_TOKEN);
    });
  });
});
