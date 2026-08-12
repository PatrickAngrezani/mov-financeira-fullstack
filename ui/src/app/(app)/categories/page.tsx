import { setArchived } from './actions';
import { DeleteCategoryButton, NewCategoryForm } from './category-controls';
import { api } from '@/lib/api';
import type { Category } from '@/lib/types';
import { Card, EmptyState } from '@/components/ui';

export default async function CategoriesPage() {
  const categories = await api<Category[]>('/categories?includeArchived=true');

  const active = categories.filter((category) => !category.archived);
  const archived = categories.filter((category) => category.archived);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Categorias</h1>
        <p className="text-sm text-ink-soft">
          Arquivar remove a categoria dos formulários de lançamento sem apagar o
          histórico.
        </p>
      </div>

      <NewCategoryForm />

      <Card>
        {categories.length === 0 ? (
          <EmptyState
            title="Nenhuma categoria"
            description="Crie a primeira para começar a lançar movimentações."
          />
        ) : (
          <ul className="divide-y divide-line">
            {[...active, ...archived].map((category) => (
              <li
                key={category.id}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden
                  className="h-4 w-4 shrink-0 rounded-full border border-line"
                  style={{ backgroundColor: category.color ?? '#a1a1aa' }}
                />

                <span
                  className={`flex-1 truncate text-sm ${
                    category.archived
                      ? 'text-ink-faint line-through'
                      : 'font-medium text-ink'
                  }`}
                >
                  {category.name}
                </span>

                {category.archived ? (
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-soft">
                    Arquivada
                  </span>
                ) : null}

                <form action={setArchived}>
                  <input type="hidden" name="id" value={category.id} />
                  <input
                    type="hidden"
                    name="archived"
                    value={category.archived ? 'false' : 'true'}
                  />
                  <button
                    type="submit"
                    className="rounded-md px-2 py-1 text-xs font-semibold text-ink-soft hover:bg-canvas hover:text-ink"
                  >
                    {category.archived ? 'Reativar' : 'Arquivar'}
                  </button>
                </form>

                <DeleteCategoryButton category={category} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
