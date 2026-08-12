import Link from 'next/link';
import { deleteMovement } from './actions';
import { MovementDialog } from './movement-form';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import type { Category, Movement, Paginated } from '@/lib/types';
import { Button, Card, EmptyState } from '@/components/ui';

interface SearchParams {
  page?: string;
  type?: string;
  categoryId?: string;
  from?: string;
  to?: string;
}

const PER_PAGE = 10;

function toQuery(params: SearchParams): string {
  const query = new URLSearchParams({ perPage: String(PER_PAGE) });

  for (const key of ['page', 'type', 'categoryId', 'from', 'to'] as const) {
    const value = params[key];

    if (value) {
      query.set(key, value);
    }
  }

  return query.toString();
}

function pageHref(params: SearchParams, page: number): string {
  const query = new URLSearchParams();

  for (const key of ['type', 'categoryId', 'from', 'to'] as const) {
    const value = params[key];

    if (value) {
      query.set(key, value);
    }
  }

  query.set('page', String(page));

  return `/movements?${query.toString()}`;
}

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  const [page, categories] = await Promise.all([
    api<Paginated<Movement>>(`/movements?${toQuery(params)}`),
    api<Category[]>('/categories'),
  ]);

  const { data, meta } = page;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Movimentações</h1>
          <p className="text-sm text-ink-soft">
            {meta.total} {meta.total === 1 ? 'lançamento' : 'lançamentos'}
          </p>
        </div>

        <MovementDialog
          categories={categories}
          title="Nova movimentação"
          trigger={<Button>Nova movimentação</Button>}
        />
      </div>

      <Card className="p-4">
        {/* form method=GET: os filtros viram query string sem uma linha de JS. */}
        <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Tipo
            <select
              name="type"
              defaultValue={params.type ?? ''}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Todos</option>
              <option value="INCOME">Receitas</option>
              <option value="EXPENSE">Despesas</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Categoria
            <select
              name="categoryId"
              defaultValue={params.categoryId ?? ''}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            De
            <input
              type="date"
              name="from"
              defaultValue={params.from ?? ''}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-ink-soft">
            Até
            <input
              type="date"
              name="to"
              defaultValue={params.to ?? ''}
              className="rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <div className="flex items-end gap-2">
            <Button type="submit" variant="secondary">
              Filtrar
            </Button>
            <Link
              href="/movements"
              className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Limpar
            </Link>
          </div>
        </form>
      </Card>

      <Card>
        {data.length === 0 ? (
          <EmptyState
            title="Nenhuma movimentação encontrada"
            description="Ajuste os filtros ou adicione o primeiro lançamento."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((movement) => (
              <li
                key={movement.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{
                    backgroundColor: movement.category.color ?? '#a1a1aa',
                  }}
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">
                    {movement.description}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {formatDate(movement.occurredAt)} ·{' '}
                    {movement.category.name}
                  </p>
                </div>

                <span
                  className={`text-sm font-semibold tabular-nums ${
                    movement.type === 'INCOME' ? 'text-income' : 'text-expense'
                  }`}
                >
                  {movement.type === 'INCOME' ? '+' : '−'}{' '}
                  {formatMoney(movement.amount)}
                </span>

                <div className="flex gap-1">
                  <MovementDialog
                    categories={categories}
                    movement={movement}
                    title="Editar movimentação"
                    trigger={
                      <span className="rounded-md px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-canvas hover:text-ink">
                        Editar
                      </span>
                    }
                  />

                  <form action={deleteMovement}>
                    <input type="hidden" name="id" value={movement.id} />
                    <button
                      type="submit"
                      className="rounded-md px-2 py-1 text-xs font-semibold text-expense hover:bg-expense/5"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {meta.totalPages > 1 ? (
        <nav className="flex items-center justify-between gap-3">
          <span className="text-sm text-ink-soft">
            Página {meta.page} de {meta.totalPages}
          </span>

          <div className="flex gap-2">
            {meta.page > 1 ? (
              <Link
                href={pageHref(params, meta.page - 1)}
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
              >
                Anterior
              </Link>
            ) : null}

            {meta.page < meta.totalPages ? (
              <Link
                href={pageHref(params, meta.page + 1)}
                className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
              >
                Próxima
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
