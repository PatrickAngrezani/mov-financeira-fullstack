import Image from 'next/image';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="" width={56} height={56} priority />
          <h1 className="mt-4 text-xl font-bold text-ink">
            Movimentações Financeiras
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Controle suas receitas e despesas.
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
