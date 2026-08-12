import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { logout } from '../(auth)/actions';
import { ApiError, api } from '@/lib/api';
import type { User } from '@/lib/types';
import { Button } from '@/components/ui';

const LINKS = [
  { href: '/movements', label: 'Movimentações' },
  { href: '/categories', label: 'Categorias' },
];

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  let user: User;

  try {
    user = await api<User>('/auth/me');
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect('/login');
    }

    throw error;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-4 py-3">
          <Link href="/movements" className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={28} height={28} />
            <span className="text-sm font-bold text-ink">Movimentações</span>
          </Link>

          <nav className="flex gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-ink-soft hover:bg-canvas hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-ink-soft sm:inline">
              {user.name}
            </span>
            <form action={logout}>
              <Button variant="secondary" type="submit">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
