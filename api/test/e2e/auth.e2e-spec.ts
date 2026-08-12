import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { AppModule } from '@src/app.module';
import { createFastifyAdapter } from '@src/http.setup';
import { PrismaService } from '@src/prisma/prisma.service';

interface Envelope {
  statusCode: number;
  code: string;
  message: string;
  details?: { field: string; message: string }[];
}

interface Session {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: { id: string; name: string; email: string; createdAt: string };
}

describe('Auth (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const emails: string[] = [];

  const newEmail = (): string => {
    const email = `e2e-${randomUUID()}@exemplo.com`;
    emails.push(email);
    return email;
  };

  let requests = 0;
  const nextIp = (): string => {
    requests += 1;
    return `10.${(requests >> 16) & 255}.${(requests >> 8) & 255}.${requests & 255}`;
  };

  const post = <T>(
    url: string,
    payload: Record<string, unknown>,
  ): Promise<{ status: number; body: T }> =>
    app
      .inject({
        method: 'POST',
        url,
        payload,
        headers: { 'x-forwarded-for': nextIp() },
      })
      .then((res) => ({
        status: res.statusCode,
        body: JSON.parse(res.body) as T,
      }));

  const get = <T>(
    url: string,
    token?: string,
  ): Promise<{ status: number; body: T }> =>
    app
      .inject({
        method: 'GET',
        url,
        headers: {
          'x-forwarded-for': nextIp(),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      })
      .then((res) => ({
        status: res.statusCode,
        body: JSON.parse(res.body) as T,
      }));

  const register = (email: string, password = 'senha-de-teste-123') =>
    post<Session>('/auth/register', { name: 'Usuario E2E', email, password });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      createFastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (emails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('cria a conta, devolve token e nao vaza o hash', async () => {
      const { status, body } = await register(newEmail());

      expect(status).toBe(201);
      expect(body.tokenType).toBe('Bearer');
      expect(body.expiresIn).toBe(3600);
      expect(body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
      expect(JSON.stringify(body)).not.toContain('passwordHash');
      expect(new Date(body.user.createdAt).toISOString()).toBe(
        body.user.createdAt,
      );
    });

    it('cria as 8 categorias padrao no mesmo instante do usuario', async () => {
      const { body } = await register(newEmail());

      const categories = await prisma.category.findMany({
        where: { userId: body.user.id },
        select: { name: true, color: true, createdAt: true },
      });

      expect(categories).toHaveLength(8);
      expect(new Set(categories.map((c) => c.createdAt.getTime())).size).toBe(
        1,
      );
    });

    it('devolve 409 EMAIL_ALREADY_REGISTERED em e-mail repetido', async () => {
      const email = newEmail();
      await register(email);

      const { status, body } = await post<Envelope>('/auth/register', {
        name: 'Outro',
        email,
        password: 'outra-senha-123',
      });

      expect(status).toBe(409);
      expect(body.code).toBe('EMAIL_ALREADY_REGISTERED');
      expect(body.details).toEqual([
        { field: 'email', message: 'Este e-mail ja esta cadastrado.' },
      ]);
    });

    it('rejeita campo nao declarado no DTO', async () => {
      const { status, body } = await post<Envelope>('/auth/register', {
        name: 'X',
        email: newEmail(),
        password: 'senha-de-teste-123',
        isAdmin: true,
      });

      expect(status).toBe(400);
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.details?.map((d) => d.field)).toContain('isAdmin');
    });
  });

  describe('POST /auth/login', () => {
    it('mesma resposta para senha errada e conta inexistente', async () => {
      const email = newEmail();
      await register(email);

      const wrongPassword = await post<Envelope>('/auth/login', {
        email,
        password: 'senha-completamente-errada',
      });
      const unknownAccount = await post<Envelope>('/auth/login', {
        email: `nao-existe-${randomUUID()}@exemplo.com`,
        password: 'senha-completamente-errada',
      });

      expect(wrongPassword.status).toBe(unknownAccount.status);
      expect(wrongPassword.body.code).toBe(unknownAccount.body.code);
      expect(wrongPassword.body.message).toBe(unknownAccount.body.message);
      expect(wrongPassword.body.details).toBeUndefined();
      expect(unknownAccount.body.details).toBeUndefined();
      expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /auth/me', () => {
    it('devolve o perfil do titular do token', async () => {
      const email = newEmail();
      const { body: session } = await register(email);

      const { status, body } = await get<Session['user']>(
        '/auth/me',
        session.accessToken,
      );

      expect(status).toBe(200);
      expect(body).toEqual(session.user);
    });

    it('reflete alteracao feita no banco depois do login', async () => {
      const { body: session } = await register(newEmail());

      await prisma.user.update({
        where: { id: session.user.id },
        data: { name: 'Nome Alterado Fora da API' },
      });

      const { body } = await get<Session['user']>(
        '/auth/me',
        session.accessToken,
      );

      expect(body.name).toBe('Nome Alterado Fora da API');
    });

    it('devolve 401 quando a conta do token foi removida', async () => {
      const email = newEmail();
      const { body: session } = await register(email);

      await prisma.user.delete({ where: { id: session.user.id } });

      const { status, body } = await get<Envelope>(
        '/auth/me',
        session.accessToken,
      );

      expect(status).toBe(401);
      expect(body.code).toBe('INVALID_TOKEN');
    });
  });
});
