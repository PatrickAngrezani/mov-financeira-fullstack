import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// A partir do Prisma 7 a conexao deixou de ser declarada no schema
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node dist/seed.js',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
