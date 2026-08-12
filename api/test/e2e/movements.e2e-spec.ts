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
}

interface Movement {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  amount: string;
  description: string;
  occurredAt: string;
  category: { id: string; name: string; color: string | null };
  createdAt: string;
  updatedAt: string;
}

interface Page {
  data: Movement[];
  meta: { page: number; perPage: number; total: number; totalPages: number };
}

interface Session {
  accessToken: string;
  user: { id: string };
}

describe('Movements (e2e)', () => {
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
    const email = `e2e-mov-${randomUUID()}@exemplo.com`;
    emails.push(email);
    const { body } = await call<Session>('POST', '/auth/register', {
      payload: { name: 'Dono E2E', email, password: 'senha-de-teste-123' },
    });
    return body;
  };

  const firstCategoryOf = async (token: string): Promise<Category> => {
    const { body } = await call<Category[]>('GET', '/categories', { token });
    return body[0] as Category;
  };

  const post = (
    token: string,
    payload: Record<string, unknown>,
  ): Promise<{ status: number; body: Movement }> =>
    call<Movement>('POST', '/movements', { token, payload });

  let owner: Session;
  let category: Category;

  const baseMovement = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    type: 'EXPENSE',
    amount: '1234.56',
    description: 'Assinatura mensal',
    occurredAt: '2026-08-10',
    categoryId: category.id,
    ...overrides,
  });

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
    category = await firstCategoryOf(owner.accessToken);
  });

  afterAll(async () => {
    if (emails.length > 0) {
      await prisma.user.deleteMany({ where: { email: { in: emails } } });
    }
    await app.close();
  });

  describe('POST /movements', () => {
    it('cria a movimentacao com a categoria aninhada', async () => {
      const { status, body } = await post(owner.accessToken, baseMovement());

      expect(status).toBe(201);
      expect(body).toMatchObject({
        type: 'EXPENSE',
        amount: '1234.56',
        description: 'Assinatura mensal',
        occurredAt: '2026-08-10',
      });
      expect(body.category.id).toBe(category.id);
      expect(body).not.toHaveProperty('userId');
      expect(body).not.toHaveProperty('categoryId');
    });

    describe('dinheiro nao perde centavos', () => {
      it.each([
        ['10.1', '10.10'],
        ['10.10', '10.10'],
        ['0.01', '0.01'],
        ['999999999999.99', '999999999999.99'],
      ])('amount %s sai como %s', async (enviado, esperado) => {
        const { body } = await post(
          owner.accessToken,
          baseMovement({ amount: enviado, description: `valor ${enviado}` }),
        );

        expect(body.amount).toBe(esperado);
      });

    });

    describe('validacao de valor', () => {
      it.each(['0', '0.00', '-5', '1234.567', 'abc', ''])(
        'rejeita amount %s',
        async (amount) => {
          const { status } = await call<Envelope>('POST', '/movements', {
            token: owner.accessToken,
            payload: baseMovement({ amount }),
          });

          expect(status).toBe(400);
        },
      );

      it('recusa type fora do enum', async () => {
        const { status, body } = await call<Envelope>('POST', '/movements', {
          token: owner.accessToken,
          payload: baseMovement({ type: 'TRANSFER' }),
        });

        expect(status).toBe(400);
        expect(body.details?.map((d) => d.field)).toContain('type');
      });
    });

    describe('ownership da categoria', () => {
      it('devolve 422 apontando categoryId para categoria de OUTRO dono', async () => {
        const other = await registerUser();
        const alheia = await firstCategoryOf(other.accessToken);

        const { status, body } = await call<Envelope>('POST', '/movements', {
          token: owner.accessToken,
          payload: baseMovement({ categoryId: alheia.id }),
        });

        expect(status).toBe(422);
        expect(body.code).toBe('CATEGORY_NOT_FOUND');
        expect(body.details?.[0]?.field).toBe('categoryId');
      });
    });
  });

  describe('GET /movements', () => {
    let lister: Session;
    let listerCategories: Category[];

    beforeAll(async () => {
      lister = await registerUser();
      const { body } = await call<Category[]>('GET', '/categories', {
        token: lister.accessToken,
      });
      listerCategories = body;

      // 25 movimentacoes: 15 despesas em agosto, 10 receitas em setembro.
      for (let i = 0; i < 15; i += 1) {
        await post(lister.accessToken, {
          type: 'EXPENSE',
          amount: '10.00',
          description: `despesa ${i}`,
          occurredAt: `2026-08-${String(i + 1).padStart(2, '0')}`,
          categoryId: listerCategories[0]?.id,
        });
      }
      for (let i = 0; i < 10; i += 1) {
        await post(lister.accessToken, {
          type: 'INCOME',
          amount: '100.00',
          description: `receita ${i}`,
          occurredAt: `2026-09-${String(i + 1).padStart(2, '0')}`,
          categoryId: listerCategories[1]?.id,
        });
      }
    });

    it('ordena por data decrescente', async () => {
      const { body } = await call<Page>('GET', '/movements?perPage=100', {
        token: lister.accessToken,
      });
      const datas = body.data.map((m) => m.occurredAt);

      expect(datas).toEqual([...datas].sort().reverse());
    });

    it('filtra por type', async () => {
      const { body } = await call<Page>(
        'GET',
        '/movements?type=INCOME&perPage=100',
        { token: lister.accessToken },
      );

      expect(body.meta.total).toBe(10);
      expect(body.data.every((m) => m.type === 'INCOME')).toBe(true);
    });

    it('filtra por categoryId', async () => {
      const alvo = listerCategories[1]?.id;

      const { body } = await call<Page>(
        'GET',
        `/movements?categoryId=${alvo}&perPage=100`,
        { token: lister.accessToken },
      );

      expect(body.meta.total).toBe(10);
      expect(body.data.every((m) => m.category.id === alvo)).toBe(true);
    });

    it('filtra por periodo, com limites inclusivos', async () => {
      const { body } = await call<Page>(
        'GET',
        '/movements?from=2026-08-01&to=2026-08-15&perPage=100',
        { token: lister.accessToken },
      );

      expect(body.meta.total).toBe(15);
      expect(body.data.map((m) => m.occurredAt)).toContain('2026-08-01');
      expect(body.data.map((m) => m.occurredAt)).toContain('2026-08-15');
    });

    it('Nunca', async () => {
      const { body } = await call<Page>('GET', '/movements?perPage=100', {
        token: owner.accessToken,
      });

      const alheias = await prisma.movement.findMany({
        where: { userId: lister.user.id },
        select: { id: true },
      });
      const idsAlheios = new Set(alheias.map((m) => m.id));

      expect(body.data.some((m) => idsAlheios.has(m.id))).toBe(false);
    });
  });

  describe('GET /movements/:id', () => {
    it('detalha a propria movimentacao', async () => {
      const { body: criada } = await post(owner.accessToken, baseMovement());

      const { status, body } = await call<Movement>(
        'GET',
        `/movements/${criada.id}`,
        { token: owner.accessToken },
      );

      expect(status).toBe(200);
      expect(body.id).toBe(criada.id);
    });

    it('devolve 404, e nao 403, para movimentacao de outro dono', async () => {
      const other = await registerUser();
      const cat = await firstCategoryOf(other.accessToken);
      const { body: alheia } = await post(other.accessToken, {
        type: 'INCOME',
        amount: '50.00',
        description: 'de outro',
        occurredAt: '2026-08-10',
        categoryId: cat.id,
      });

      const { status, body } = await call<Envelope>(
        'GET',
        `/movements/${alheia.id}`,
        { token: owner.accessToken },
      );

      expect(status).toBe(404);
      expect(body.code).toBe('MOVEMENT_NOT_FOUND');
    });
  });

  describe('PATCH /movements/:id', () => {
    it('atualiza apenas os campos enviados', async () => {
      const { body: criada } = await post(owner.accessToken, baseMovement());

      const { status, body } = await call<Movement>(
        'PATCH',
        `/movements/${criada.id}`,
        { token: owner.accessToken, payload: { amount: '99.90' } },
      );

      expect(status).toBe(200);
      expect(body.amount).toBe('99.90');
      expect(body.description).toBe(criada.description);
      expect(body.occurredAt).toBe(criada.occurredAt);
    });

    it('permite editar movimentacao cuja categoria foi arquivada depois', async () => {
      const fresh = await registerUser();
      const cat = await firstCategoryOf(fresh.accessToken);
      const { body: criada } = await post(fresh.accessToken, {
        type: 'EXPENSE',
        amount: '10.00',
        description: 'antes do arquivamento',
        occurredAt: '2026-08-10',
        categoryId: cat.id,
      });
      await call('PATCH', `/categories/${cat.id}`, {
        token: fresh.accessToken,
        payload: { archived: true },
      });

      const { status, body } = await call<Movement>(
        'PATCH',
        `/movements/${criada.id}`,
        { token: fresh.accessToken, payload: { amount: '20.00' } },
      );

      expect(status).toBe(200);
      expect(body.amount).toBe('20.00');
    });

    it('recusa TROCAR para categoria arquivada', async () => {
      const fresh = await registerUser();
      const { body: cats } = await call<Category[]>('GET', '/categories', {
        token: fresh.accessToken,
      });
      const ativa = cats[0] as Category;
      const paraArquivar = cats[1] as Category;

      const { body: criada } = await post(fresh.accessToken, {
        type: 'EXPENSE',
        amount: '10.00',
        description: 'troca de categoria',
        occurredAt: '2026-08-10',
        categoryId: ativa.id,
      });
      await call('PATCH', `/categories/${paraArquivar.id}`, {
        token: fresh.accessToken,
        payload: { archived: true },
      });

      const { status, body } = await call<Envelope>(
        'PATCH',
        `/movements/${criada.id}`,
        {
          token: fresh.accessToken,
          payload: { categoryId: paraArquivar.id },
        },
      );

      expect(status).toBe(422);
      expect(body.code).toBe('CATEGORY_ARCHIVED');
    });

    it('NAO altera movimentacao de outro dono', async () => {
      const other = await registerUser();
      const cat = await firstCategoryOf(other.accessToken);
      const { body: alheia } = await post(other.accessToken, {
        type: 'INCOME',
        amount: '50.00',
        description: 'intocavel',
        occurredAt: '2026-08-10',
        categoryId: cat.id,
      });

      const { status } = await call<Envelope>(
        'PATCH',
        `/movements/${alheia.id}`,
        { token: owner.accessToken, payload: { amount: '1.00' } },
      );
      const naoMudou = await prisma.movement.findUnique({
        where: { id: alheia.id },
        select: { amount: true },
      });

      expect(status).toBe(404);
      expect(naoMudou?.amount.toFixed(2)).toBe('50.00');
    });
  });

  describe('DELETE /movements/:id', () => {
    it('exclui e devolve 204', async () => {
      const { body: criada } = await post(owner.accessToken, baseMovement());

      const { status } = await call('DELETE', `/movements/${criada.id}`, {
        token: owner.accessToken,
      });
      const sumiu = await prisma.movement.findUnique({
        where: { id: criada.id },
      });

      expect(status).toBe(204);
      expect(sumiu).toBeNull();
    });

    it('devolve 404 para id inexistente', async () => {
      const { status, body } = await call<Envelope>(
        'DELETE',
        `/movements/${randomUUID()}`,
        { token: owner.accessToken },
      );

      expect(status).toBe(404);
      expect(body.code).toBe('MOVEMENT_NOT_FOUND');
    });
  });
});
