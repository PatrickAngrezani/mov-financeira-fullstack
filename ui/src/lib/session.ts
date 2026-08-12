import { cookies } from 'next/headers';
import { env } from './env';

export const SESSION_COOKIE = 'mf_session';

export async function saveSession(
  token: string,
  expiresInSeconds: number,
): Promise<void> {
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: expiresInSeconds,
  });
}

export async function readSession(): Promise<string | null> {
  const store = await cookies();

  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();

  store.delete(SESSION_COOKIE);
}
