'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, api } from '@/lib/api';
import type { Category } from '@/lib/types';

export interface CategoryFormState {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
}

function text(data: FormData, key: string): string {
  const value = data.get(key);

  return typeof value === 'string' ? value.trim() : '';
}

function fail(error: unknown): CategoryFormState {
  if (error instanceof ApiError) {
    const fieldErrors = error.fieldErrors;

    return {
      message: error.message,
      ...(Object.keys(fieldErrors).length > 0 ? { fieldErrors } : {}),
    };
  }

  return { message: 'Nao foi possivel falar com o servidor.' };
}

function refresh(): void {
  revalidatePath('/categories');
  revalidatePath('/movements');
}

export async function createCategory(
  _previous: CategoryFormState,
  data: FormData,
): Promise<CategoryFormState> {
  try {
    await api<Category>('/categories', {
      method: 'POST',
      body: { name: text(data, 'name'), color: text(data, 'color') },
    });
  } catch (error) {
    return fail(error);
  }

  refresh();

  return { ok: true };
}

export async function setArchived(data: FormData): Promise<void> {
  const id = data.get('id');
  const archived = data.get('archived') === 'true';

  if (typeof id !== 'string') {
    return;
  }

  await api<Category>(`/categories/${id}`, {
    method: 'PATCH',
    body: { archived },
  });

  refresh();
}

export async function deleteCategory(
  data: FormData,
): Promise<{ error?: string } | void> {
  const id = data.get('id');

  if (typeof id !== 'string') {
    return;
  }

  try {
    await api<void>(`/categories/${id}`, { method: 'DELETE' });
  } catch (error) {
    if (error instanceof ApiError) {
      return { error: error.message };
    }

    throw error;
  }

  refresh();
}
