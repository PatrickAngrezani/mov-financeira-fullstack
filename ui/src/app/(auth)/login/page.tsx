'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, type FormState } from '../actions';
import { Alert, Button, Card, Field, Input } from '@/components/ui';

const INITIAL: FormState = {};

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, INITIAL);

  return (
    <Card className="p-6">
      <form action={action} className="flex flex-col gap-4" noValidate>
        <h2 className="text-lg font-semibold text-ink">Entrar</h2>

        {state.message && !state.fieldErrors ? (
          <Alert>{state.message}</Alert>
        ) : null}

        <Field label="E-mail" htmlFor="email" error={state.fieldErrors?.email}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.values?.email}
            invalid={Boolean(state.fieldErrors?.email)}
            placeholder="voce@exemplo.com"
          />
        </Field>

        <Field
          label="Senha"
          htmlFor="password"
          error={state.fieldErrors?.password}
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            invalid={Boolean(state.fieldErrors?.password)}
          />
        </Field>

        <Button type="submit" disabled={pending}>
          {pending ? 'Entrando...' : 'Entrar'}
        </Button>

        <p className="text-center text-sm text-ink-soft">
          Não tem conta?{' '}
          <Link href="/register" className="font-semibold text-brand">
            Cadastre-se
          </Link>
        </p>
      </form>
    </Card>
  );
}
