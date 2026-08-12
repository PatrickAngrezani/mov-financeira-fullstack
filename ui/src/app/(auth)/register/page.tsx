'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { register, type FormState } from '../actions';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

const INITIAL: FormState = {};

export default function RegisterPage() {
  const [state, action, pending] = useActionState(register, INITIAL);

  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <h2 className="text-lg font-semibold text-ink">Criar conta</h2>

        {state.message && !state.fieldErrors ? (
          <Alert>{state.message}</Alert>
        ) : null}

        <Field label="Nome" htmlFor="name" error={state.fieldErrors?.name}>
          <Input
            id="name"
            name="name"
            required
            autoComplete="name"
            defaultValue={state.values?.name}
            invalid={Boolean(state.fieldErrors?.name)}
          />
        </Field>

        <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            defaultValue={state.values?.email}
            invalid={Boolean(state.fieldErrors?.email)}
          />
        </Field>

        <Field
          label="Senha"
          htmlFor="password"
          error={state.fieldErrors?.password}
          hint="Mínimo de 8 caracteres."
        >
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            invalid={Boolean(state.fieldErrors?.password)}
          />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Criando...' : 'Criar conta'}
        </Button>

        <p className="text-center text-sm text-ink-soft">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-brand">
            Entrar
          </Link>
        </p>
      </form>
    </Card>
  );
}
