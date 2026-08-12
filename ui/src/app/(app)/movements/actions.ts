'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, api } from '@/lib/api';
import type { Movement } from '@/lib/types';

export interface MovementFormState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function text(data: FormData, key: string): string {
  const value = data.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function fail(error: unknown): MovementFormState {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors;

    return {
      message: error.message,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
    };
  }

  return { message: 'Nao foi possivel falar com o servidor.' };
}

function toApiAmount(value: string): string {
  return value.replace(/\./g, '').replace(',', '.');
}

interface Payload {
  type: string;
  amount: string;
  description: string;
  occurredAt: string;
  categoryId: string;
}

function payloadFrom(data: FormData): Payload {
  return {
    type: text(data, 'type'),
    amount: toApiAmount(text(data, 'amount')),
    description: text(data, 'description'),
    occurredAt: text(data, 'occurredAt'),
    categoryId: text(data, 'categoryId'),
  };
}

export async function createMovement(
  _previous: MovementFormState,
  data: FormData,
): Promise<MovementFormState> {
  try {
    await api<Movement>('/movements', {
      method: 'POST',
      body: payloadFrom(data),
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath('/movements');

  return { ok: true };
}

export async function updateMovement(
  _previous: MovementFormState,
  data: FormData,
): Promise<MovementFormState> {
  const id = text(data, 'id');

  try {
    await api<Movement>(`/movements/${id}`, {
      method: 'PATCH',
      body: payloadFrom(data),
    });
  } catch (error) {
    return fail(error);
  }

  revalidatePath('/movements');

  return { ok: true };
}

export async function deleteMovement(data: FormData): Promise<void> {
  const id = data.get('id');

  if (typeof id !== 'string') {
    return;
  }

  await api<void>(`/movements/${id}`, { method: 'DELETE' });
  revalidatePath('/movements');
}
