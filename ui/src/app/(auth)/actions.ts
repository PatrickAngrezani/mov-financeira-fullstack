'use server';

import { redirect } from 'next/navigation';
import { ApiError, api } from '@/lib/api';
import { clearSession, saveSession } from '@/lib/session';
import type { Session } from '@/lib/types';

export interface FormState {
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

function text(data: FormData, key: string): string {
  const value = data.get(key);

  return typeof value === 'string' ? value : '';
}

function toFormState(
  error: unknown,
  values: Record<string, string>,
): FormState {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors;

    return {
      values,
      ...(Object.keys(fieldErrors).length > 0
        ? { fieldErrors, message: error.message }
        : { message: error.message }),
    };
  }

  return {
    values,
    message: 'Nao foi possivel falar com o servidor. Tente novamente.',
  };
}

export async function login(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const values = { email: text(data, 'email') };

  try {
    const session = await api<Session>('/auth/login', {
      method: 'POST',
      anonymous: true,
      body: { email: text(data, 'email'), password: text(data, 'password') },
    });

    await saveSession(session.accessToken, session.expiresIn);
  } catch (error) {
    return toFormState(error, values);
  }

  redirect('/movements');
}

export async function register(
  _previous: FormState,
  data: FormData,
): Promise<FormState> {
  const values = { name: text(data, 'name'), email: text(data, 'email') };

  try {
    const session = await api<Session>('/auth/register', {
      method: 'POST',
      anonymous: true,
      body: {
        name: text(data, 'name'),
        email: text(data, 'email'),
        password: text(data, 'password'),
      },
    });

    await saveSession(session.accessToken, session.expiresIn);
  } catch (error) {
    return toFormState(error, values);
  }

  redirect('/movements');
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect('/login');
}
