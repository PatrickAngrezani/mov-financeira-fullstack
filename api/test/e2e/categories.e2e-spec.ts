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

interface Category {
  id: string;
  name: string;
  color: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Session {
  accessToken: string;
  user: { id: string };
}

describe('Categories (e2e)', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  const emails: string[] = [];
  let requests = 0;

  const nextIp = (): string => {
    requests += 1;
    return `10.${(requests >> 16) & 255}.${(requests >> 8) & 255}.${requests & 255}`;
  };

  const call = async <T>(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    options: { token?: string; payload?: Record<string, unknown> } = {},
  ): Promise<{ status: number; body: T }> => {
    const response = await app.inject({
      method,
      url,
      ...(options.payload ? { payload: options.payload } : {}),
      headers: {
        'x-forwarded-for': nextIp(),
        ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      },
    });

    return {
      status: response.statusCode,
      body: (response.body ? JSON.parse(response.body) : undefined) as T,
    };
  };

  const registerUser = async (): Promise<Session> => {
    const email = `e2e-cat-${randomUUID()}@exemplo.com`;
    emails.push(email);

    const { body } = await call<Session>('POST', '/auth/register', {
      payload: { name: 'Dono E2E', email, password: 'senha-de-teste-123' },
    });

    return body;
  };

  const createCategory = (
    token: string,
    payload: Record<string, unknown>,
  ): Promise<{ status: number; body: Category }> =>
    call<Category>('POST', '/categories', { token, payload });

  let owner: Session;

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
    owner = await registerUser();
  });

  afterAll(async () => {
    if (emails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await app.close();
  });

  const uniqueName = (): string => `Cat ${randomUUID().slice(0, 8)}`;

  describe('POST /categories', () => {
    it('devolve 409 CATEGORY_ALREADY_EXISTS em nome repetido do mesmo dono', async () => {
      const name = uniqueName();
      await createCategory(owner.accessToken, { name });

      const { status, body } = await call<Envelope>('POST', '/categories', {
        token: owner.accessToken,
        payload: { name },
      });

      expect(status).toBe(409);
      expect(body.code).toBe('CATEGORY_ALREADY_EXISTS');
      expect(body.details?.[0]?.field).toBe('name');
    });

    it('permite o mesmo nome para donos diferentes', async () => {
      const other = await registerUser();
      const name = uniqueName();

      const first = await createCategory(owner.accessToken, { name });
      const second = await createCategory(other.accessToken, { name });

      expect(first.status).toBe(201);
      expect(second.status).toBe(201);
    });

    it('exige autenticacao', async () => {
      const { status, body } = await call<Envelope>('POST', '/categories', {
        payload: { name: uniqueName() },
      });

      expect(status).toBe(401);
      expect(body.code).toBe('MISSING_TOKEN');
    });
  });

  describe('GET /categories', () => {
    it('traz as 8 categorias padrao do registro', async () => {
      const fresh = await registerUser();

      const { status, body } = await call<Category[]>('GET', '/categories', {
        token: fresh.accessToken,
      });

      expect(status).toBe(200);
      expect(body).toHaveLength(8);
      expect(body.map((c) => c.name)).toContain('Alimentação');
    });

    it('devolve as categorias em ordem alfabetica', async () => {
      const fresh = await registerUser();

      const { body } = await call<Category[]>('GET', '/categories', {
        token: fresh.accessToken,
      });
      const names = body.map((c) => c.name);

      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });



    it('lista ATIVAS antes das arquivadas', async () => {
      const fresh = await registerUser();
      const { body: arquivada } = await createCategory(fresh.accessToken, {
        name: 'AAA arquivada',
      });
      await call('PATCH', `/categories/${arquivada.id}`, {
        token: fresh.accessToken,
        payload: { archived: true },
      });

      const { body } = await call<Category[]>(
        'GET',
        '/categories?includeArchived=true',
        { token: fresh.accessToken },
      );

      expect(body.at(-1)?.id).toBe(arquivada.id);
      expect(body.filter((c) => !c.archived).length).toBe(body.length - 1);
    });

    it('NUNCA devolve categoria de outro dono', async () => {
      const other = await registerUser();
      const { body: alheia } = await createCategory(other.accessToken, {
        name: uniqueName(),
      });

      const { body } = await call<Category[]>(
        'GET',
        '/categories?includeArchived=true',
        { token: owner.accessToken },
      );

      expect(body.map((c) => c.id)).not.toContain(alheia.id);
    });

    it('recusa includeArchived com valor que nao e booleano', async () => {
      const { status, body } = await call<Envelope>(
        'GET',
        '/categories?includeArchived=talvez',
        { token: owner.accessToken },
      );

      expect(status).toBe(400);
      expect(body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('GET /categories/:id', () => {
    it('detalha a propria categoria', async () => {
      const { body: created } = await createCategory(owner.accessToken, {
        name: uniqueName(),
      });

      const { status, body } = await call<Category>(
        'GET',
        `/categories/${created.id}`,
        { token: owner.accessToken },
      );

      expect(status).toBe(200);
      expect(body.id).toBe(created.id);
    });

    it('devolve 400 para id que nao e uuid, em vez de 500 do Postgres', async () => {
      const { status, body } = await call<Envelope>(
        'GET',
        '/categories/nao-e-uuid',
        { token: owner.accessToken },
      );

      expect(status).toBe(400);
      expect(body.code).toBe('VALIDATION_FAILED');
    });
  });

  describe('PATCH /categories/:id', () => {
    it('arquiva e reativa', async () => {
      const { body: created } = await createCategory(owner.accessToken, {
        name: uniqueName(),
      });

      const arquivada = await call<Category>(
        'PATCH',
        `/categories/${created.id}`,
        { token: owner.accessToken, payload: { archived: true } },
      );
      const reativada = await call<Category>(
        'PATCH',
        `/categories/${created.id}`,
        { token: owner.accessToken, payload: { archived: false } },
      );

      expect(arquivada.body.archived).toBe(true);
      expect(reativada.body.archived).toBe(false);
    });

    it('nao altera categoria de outro dono, devolvendo 404', async () => {
      const other = await registerUser();
      const nomeOriginal = uniqueName();
      const { body: alheia } = await createCategory(other.accessToken, {
        name: nomeOriginal,
      });

      const { status } = await call<Envelope>(
        'PATCH',
        `/categories/${alheia.id}`,
        { token: owner.accessToken, payload: { name: 'invadida' } },
      );

      const naoMudou = await prisma.category.findUnique({
        where: { id: alheia.id },
        select: { name: true },
      });

      expect(status).toBe(404);
      expect(naoMudou?.name).toBe(nomeOriginal);
    });

    it('rejeita campo nao declarado no DTO', async () => {
      const { body: created } = await createCategory(owner.accessToken, {
        name: uniqueName(),
      });

      const { status } = await call<Envelope>(
        'PATCH',
        `/categories/${created.id}`,
        { token: owner.accessToken, payload: { userId: randomUUID() } },
      );

      expect(status).toBe(400);
    });
  });

  describe('DELETE /categories/:id', () => {
    it('exclui categoria sem movimentacoes e devolve 204', async () => {
      const { body: created } = await createCategory(owner.accessToken, {
        name: uniqueName(),
      });

      const { status } = await call('DELETE', `/categories/${created.id}`, {
        token: owner.accessToken,
      });
      const sumiu = await prisma.category.findUnique({
        where: { id: created.id },
      });

      expect(status).toBe(204);
      expect(sumiu).toBeNull();
    });

    it('devolve 409 CATEGORY_IN_USE quando ha movimentacao vinculada', async () => {
      const { body: created } = await createCategory(owner.accessToken, {
        name: uniqueName(),
      });

      await prisma.movement.create({
        data: {
          userId: owner.user.id,
          categoryId: created.id,
          type: 'EXPENSE',
          amount: '10.00',
          description: 'trava a exclusao',
          occurredAt: new Date('2026-08-10'),
        },
      });

      const { status, body } = await call<Envelope>(
        'DELETE',
        `/categories/${created.id}`,
        { token: owner.accessToken },
      );
      const continuaLa = await prisma.category.findUnique({
        where: { id: created.id },
      });

      expect(status).toBe(409);
      expect(body.code).toBe('CATEGORY_IN_USE');
      expect(continuaLa).not.toBeNull();
    });

    it('nao exclui categoria de outro dono, devolvendo 404', async () => {
      const other = await registerUser();
      const { body: alheia } = await createCategory(other.accessToken, {
        name: uniqueName(),
      });

      const { status } = await call<Envelope>(
        'DELETE',
        `/categories/${alheia.id}`,
        { token: owner.accessToken },
      );
      const intacta = await prisma.category.findUnique({
        where: { id: alheia.id },
      });

      expect(status).toBe(404);
      expect(intacta).not.toBeNull();
    });

    it('devolve 404 para id inexistente', async () => {
      const { status, body } = await call<Envelope>(
        'DELETE',
        `/categories/${randomUUID()}`,
        { token: owner.accessToken },
      );

      expect(status).toBe(404);
      expect(body.code).toBe('CATEGORY_NOT_FOUND');
    });
  });

  describe('FK composta bloqueia IDOR', () => {
    it('recusa valor negativo, via CHECK (amount > 0)', async () => {
      const { body: propria } = await createCategory(owner.accessToken, {
        name: uniqueName(),
      });

      const tentativa = prisma.movement.create({
        data: {
          userId: owner.user.id,
          categoryId: propria.id,
          type: 'EXPENSE',
          amount: '-10.00',
          description: 'valor negativo',
          occurredAt: new Date('2026-08-10'),
        },
      });

      await expect(tentativa).rejects.toThrow();
    });
  });
});
