import { env } from './env';
import { readSession } from './session';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: ErrorDetail[];
  correlationId: string;
  timestamp: string;
  path: string;
}

export class ApiError extends Error {
  constructor(readonly envelope: ErrorEnvelope) {
    super(envelope.message);
    this.name = 'ApiError';
  }

  get code(): string {
    return this.envelope.code;
  }

  get status(): number {
    return this.envelope.statusCode;
  }

  get fieldErrors(): Record<string, string> {
    return Object.fromEntries(
      (this.envelope.details ?? []).map((d) => [d.field, d.message]),
    );
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  anonymous?: boolean;
  tags?: string[];
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, anonymous = false, tags } = options;
  const token = anonymous ? null : await readSession();

  const response = await fetch(`${env.apiUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    ...(tags ? { next: { tags } } : { cache: 'no-store' }),
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      (payload as ErrorEnvelope | null) ?? {
        statusCode: response.status,
        code: 'UNKNOWN_ERROR',
        message: 'Nao foi possivel completar a operacao.',
        correlationId: '',
        timestamp: new Date().toISOString(),
        path,
      },
    );
  }

  return payload as T;
}
