'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  createCategory,
  deleteCategory,
  type CategoryFormState,
} from './actions';
import { Alert, Button, Card, Field, Input } from '@/components/ui';
import type { Category } from '@/lib/types';

const INITIAL: CategoryFormState = {};

const PALETTE = [
  '#EF4444',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#10B981',
  '#3B82F6',
  '#A855F7',
  '#6B7280',
];

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(createCategory, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <Card className="p-4">
      <form
        ref={formRef}
        action={action}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        noValidate
      >
        <div className="flex-1">
          <Field label="Nova categoria" htmlFor="name" error={state.fieldErrors?.name}>
            <Input
              id="name"
              name="name"
              required
              maxLength={60}
              placeholder="Assinaturas"
              invalid={Boolean(state.fieldErrors?.name)}
            />
          </Field>
        </div>

        <Field label="Cor" htmlFor="color" error={state.fieldErrors?.color}>
          <div className="flex items-center gap-2">
            <input
              id="color"
              name="color"
              type="color"
              defaultValue={PALETTE[0]}
              className="h-9 w-14 cursor-pointer rounded-md border border-line bg-surface p-1"
            />
          </div>
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : 'Adicionar'}
        </Button>
      </form>

      {state.message && !state.fieldErrors ? (
        <div className="mt-3">
          <Alert>{state.message}</Alert>
        </div>
      ) : null}
    </Card>
  );
}

export function DeleteCategoryButton({ category }: { category: Category }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          setPending(true);

          const data = new FormData();
          data.set('id', category.id);

          void deleteCategory(data)
            .then((result) => {
              if (result?.error) {
                setError(result.error);
              }
            })
            .finally(() => setPending(false));
        }}
        className="rounded-md px-2 py-1 text-xs font-semibold text-expense hover:bg-expense/5 disabled:opacity-60"
      >
        Excluir
      </button>

      {error ? (
        <p role="alert" className="max-w-xs text-right text-xs text-expense">
          {error}
        </p>
      ) : null}
    </div>
  );
}
