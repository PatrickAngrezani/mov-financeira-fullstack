'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import {
  createMovement,
  updateMovement,
  type MovementFormState,
} from './actions';
import { Alert, Button, Field, Input, Select } from '@/components/ui';
import type { Category, Movement } from '@/lib/types';

const INITIAL: MovementFormState = {};

export function MovementForm({
  categories,
  movement,
  onDone,
}: {
  categories: Category[];
  movement?: Movement;
  onDone: () => void;
}) {
  const editing = movement !== undefined;
  const [state, action, pending] = useActionState(
    editing ? updateMovement : createMovement,
    INITIAL,
  );
  const closed = useRef(false);

  useEffect(() => {
    if (state.ok && !closed.current) {
      closed.current = true;
      onDone();
    }
  }, [state.ok, onDone]);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {editing ? <input type="hidden" name="id" value={movement.id} /> : null}

      {state.message ? <Alert>{state.message}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tipo" htmlFor="type" error={state.fieldErrors?.type}>
          <Select
            id="type"
            name="type"
            defaultValue={movement?.type ?? 'EXPENSE'}
            invalid={Boolean(state.fieldErrors?.type)}
          >
            <option value="EXPENSE">Despesa</option>
            <option value="INCOME">Receita</option>
          </Select>
        </Field>

        <Field
          label="Valor"
          htmlFor="amount"
          error={state.fieldErrors?.amount}
          hint="Sempre positivo — o sinal vem do tipo."
        >
          <Input
            id="amount"
            name="amount"
            required
            inputMode="decimal"
            placeholder="1234,56"
            defaultValue={movement?.amount.replace('.', ',')}
            invalid={Boolean(state.fieldErrors?.amount)}
          />
        </Field>
      </div>

      <Field
        label="Descrição"
        htmlFor="description"
        error={state.fieldErrors?.description}
      >
        <Input
          id="description"
          name="description"
          required
          maxLength={255}
          defaultValue={movement?.description}
          invalid={Boolean(state.fieldErrors?.description)}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Data"
          htmlFor="occurredAt"
          error={state.fieldErrors?.occurredAt}
        >
          <Input
            id="occurredAt"
            name="occurredAt"
            type="date"
            required
            defaultValue={movement?.occurredAt}
            invalid={Boolean(state.fieldErrors?.occurredAt)}
          />
        </Field>

        <Field
          label="Categoria"
          htmlFor="categoryId"
          error={state.fieldErrors?.categoryId}
        >
          <Select
            id="categoryId"
            name="categoryId"
            required
            defaultValue={movement?.category.id ?? ''}
            invalid={Boolean(state.fieldErrors?.categoryId)}
          >
            <option value="" disabled>
              Selecione
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Salvando...' : editing ? 'Salvar' : 'Adicionar'}
        </Button>
      </div>
    </form>
  );
}

export function MovementDialog({
  categories,
  movement,
  trigger,
  title,
}: {
  categories: Category[];
  movement?: Movement;
  trigger: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="contents">
        {trigger}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="w-full max-w-lg rounded-t-lg border border-line bg-surface p-5 shadow-lg sm:rounded-lg"
          >
            <h2 className="mb-4 text-lg font-semibold text-ink">{title}</h2>
            <MovementForm
              categories={categories}
              movement={movement}
              onDone={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
