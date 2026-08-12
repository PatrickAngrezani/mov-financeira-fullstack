import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Movimentações Financeiras',
  description: 'Controle de movimentações financeiras pessoais.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
