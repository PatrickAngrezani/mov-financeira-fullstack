# Movimentações Financeiras

Controle de movimentações financeiras pessoais: autenticação, categorias por
usuário e lançamentos de receita/despesa com filtros e paginação.

Enunciado original do desafio: [CHALLENGE.md](./CHALLENGE.md).

---

## Rodando o projeto

**Pré-requisito único: Docker.** Não é necessário Node, Postgres nem arquivo
`.env` na máquina.

```bash
git clone <url-do-repositorio>
cd mov-financeira-fullstack
docker compose up -d --build
```

O `up` sobe três serviços em ordem, esperando o anterior ficar saudável:

| Serviço | Porta | O que faz no start |
|---|---|---|
| `db` | 5432 | Postgres 16 |
| `api` | 3001 | aplica as migrations, roda o seed, sobe a API |
| `ui` | 3000 | serve o frontend |

- **Aplicação:** http://localhost:3000
- **Swagger:** http://localhost:3001/swagger
- **Health:** http://localhost:3001/health/ready

### Credenciais de demonstração

O seed cria uma conta pronta, com as 8 categorias padrão:

```
e-mail: user1@email.dev
senha:  user1-123@
```

Não é preciso rodar nada à mão: o entrypoint do container aplica as migrations,
executa o seed e só então sobe a API — nessa ordem.

O seed é **idempotente**: reiniciar o container não recria nem sobrescreve a
conta, então uma troca de senha durante a avaliação não é desfeita. Ele roda pelo
mesmo `UsersService` que atende `POST /auth/register`, com o mesmo Argon2 — por
isso as credenciais acima não podem divergir do hash gravado.

```bash
docker compose logs -f api    # acompanhar migrations e seed
docker compose down -v        # derrubar tudo, incluindo o volume do banco
```

---

## Stack

| Camada | Escolha |
|---|---|
| API | NestJS 11 sobre **Fastify** |
| ORM | **Prisma 7** |
| Banco | PostgreSQL 16 |
| Auth | JWT HS256 próprio (`@nestjs/jwt`), sem Passport; senha em **Argon2id** |
| Validação | `class-validator` + `class-transformer`; env com **Zod**, fail-fast no boot |
| Docs | Swagger (`@nestjs/swagger`) |
| Logs | Pino estruturado com `correlationId` ponta a ponta |
| Frontend | Next.js 15 (App Router) + **Tailwind v4 CSS-first** |
| Testes | Jest |

---

## Executando fora do Docker

```bash
# banco
docker compose up -d db

# API
cd api
cp .env.example .env          
npm install                   # o postinstall já roda `prisma generate`
npm run db:migrate            # aplica as migrations
npm run db:seed               # opcional: cria a conta de demonstração
npm run start:dev             # http://localhost:3001

# frontend
cd ui
npm install
API_URL=http://localhost:3001 npm run dev   # http://localhost:3000
```

### Testes

```bash
cd api
npm test          # 65 unitários — não precisam de banco
npm run test:e2e  # 99 e2e — EXIGEM o Postgres no ar (docker compose up -d db)
npm run test:all
```

---

## Banco de dados

Migrations versionadas em [`api/prisma/migrations`](./api/prisma/migrations),
aplicadas automaticamente no start do container (`prisma migrate deploy`).

Três tabelas: `users`, `categories`, `movements`.

```
users ──1:N──> categories ──1:N──> movements
  └────────────1:N───────────────────┘
```

`movements.user_id` é **desnormalizado de propósito** — permite listar as
movimentações do usuário sem JOIN e viabiliza a proteção descrita abaixo.

### Invariantes garantidas pelo banco, não pela aplicação

| Constraint | Protege contra |
|---|---|
| `movements_category_same_owner` — FK **composta** `(category_id, user_id)` → `categories(id, user_id)` | Vincular movimentação a categoria de **outro usuário**. Nem um bug no service, nem um `INSERT` manual conseguem: o banco recusa |
| `movements_amount_positive` — `CHECK (amount > 0)` | Valor negativo. `@IsPositive()` protege uma porta; migration, seed e `psql` entram por outras |
| `UNIQUE (user_id, name)` em `categories` | Categoria duplicada — por usuário, não global |
| `ON DELETE CASCADE` em `user_id` | Órfãos ao excluir usuário |
| `ON DELETE NO ACTION` em `category_id` | Apagar categoria com histórico. Vira **409 CATEGORY_IN_USE**; o caminho é arquivar |

---

## Decisões técnicas

### Dinheiro nunca passa por ponto flutuante
`NUMERIC(14,2)` no banco e **string** no JSON, na entrada e na saída.
`JSON.parse('{"amount":0.1}')` produz um float IEEE-754 e a soma de centavos
deixa de fechar. Recebendo e devolvendo texto, o valor chega ao Postgres exato.

O mapper usa `.toFixed(2)`, e isso é requisito de contrato: `Decimal.toJSON()`
do Prisma **descarta zeros à direita** — `100.00` sairia como `"100"`. Há 7 casos
de teste cobrindo isso.

### Data de competência não tem fuso
`occurredAt` é `DATE` puro e trafega como `YYYY-MM-DD`. O comportamento foi
**medido** antes de escrever o mapper: o adapter do Prisma devolve `DATE` como
meia-noite **UTC**, então formatar por partes locais erraria um dia em qualquer
fuso negativo. Os testes conferem contra o valor cru da coluna, não contra o que
a API devolve.

### Autorização é estrutural
Recurso de outro usuário devolve **404, nunca 403** — um 403 confirmaria que o id
existe e permitiria enumeração. As consultas são escopadas por dono no próprio
`where`, sem `if (row.userId !== userId)` para alguém esquecer.

### Sessão em cookie httpOnly (BFF)
O browser fala apenas com o Next; o Next chama a API server-to-server. O token
nunca chega ao JavaScript do cliente, então um XSS não exfiltra a sessão — e não
há CORS a configurar. Leituras por Server Components, escritas por Server Actions.

### Segurança do login
- **Argon2id**
- E-mail inexistente e senha errada devolvem resposta **idêntica** e consomem o
  **mesmo tempo** (há um hash descartável no caminho sem conta), para não revelar
  quais contas existem
- `algorithms: ['HS256']` fixado na verificação, fechando `alg: none` e a
  confusão RS256→HS256
- Rate limit: 100 req/min global, 10/min no login, 5/min no cadastro

---

## API

Todas as rotas exigem `Authorization: Bearer <token>`, exceto as marcadas.
Documentação completa e navegável no **Swagger**.

| Método | Rota | |
|---|---|---|
| POST | `/auth/register` | público — cria a conta com 8 categorias padrão e já devolve o token |
| POST | `/auth/login` | público |
| GET | `/auth/me` | perfil do titular do token |
| GET | `/categories` | `?includeArchived=true` para incluir arquivadas |
| POST · GET · PATCH · DELETE | `/categories[/:id]` | `DELETE` devolve 409 se houver movimentações |
| GET | `/movements` | `?type=&categoryId=&from=&to=&page=&perPage=` |
| POST · GET · PATCH · DELETE | `/movements[/:id]` | |
| GET | `/health/live` · `/health/ready` | público |

---

## Estrutura

```
📦 mov-financeira-fullstack
├── api/                     NestJS
│   ├── prisma/              schema + migrations
│   ├── src/
│   │   ├── auth/            controller, service, guard, dto
│   │   ├── categories/
│   │   ├── movements/
│   │   ├── users/
│   │   ├── health/
│   │   ├── prisma/          service, module, tradução de erros
│   │   ├── crypto/          Argon2
│   │   ├── config/          env (Zod) + fachada tipada
│   │   ├── logging/
│   │   └── common/          filtros, erros, dto, decorators, pipes
│   └── test/
│       ├── unit/            sem banco
│       └── e2e/             contra Postgres real
├── ui/                      Next.js
│   └── src/
│       ├── app/(auth)/      login, cadastro
│       ├── app/(app)/       movimentações, categorias
│       ├── components/
│       └── lib/             cliente da API, sessão, formatação
└── docker-compose.yml
```

Uma pasta por feature, arquivos planos dentro — o layout que `nest g resource`
gera. Cada feature tem as três camadas:

```
auth.controller.ts     só HTTP
auth.service.ts        regras de negócio, orquestração entre módulos
users.repository.ts    queries, select, where escopado por dono
```

**A divisão de responsabilidade entre service e repository**, que vale para os
três repositórios:

- o **repositório** traduz violação de *constraint* (`P2002`, `P2003`) em erro de
  domínio, porque é a única camada que enxerga esses códigos. Deixar isso para o
  service faria o vocabulário do Prisma vazar para a camada de negócio;
- a **ausência** de registro volta como `null`/`false`, sem exceção. Quem decide o
  que ausência significa é o service — aqui é 404, em outro fluxo poderia ser
  "criar se não existe".

---
