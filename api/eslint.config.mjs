// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'eslint.config.mjs',
      'dist/**',
      // Codigo gerado pelo Prisma: nao e' escrito por nos e nao ha o que
      // corrigir nele. Lintar artefato de build so produz ruido que treina o
      // time a ignorar a saida do linter.
      'src/generated/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // O boilerplate desligava no-explicit-any e rebaixava as duas regras
      // abaixo para warn. Tipagem forte e' criterio declarado do desafio, e
      // warning que ninguem le e' o mesmo que regra desligada.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

    },
  },
  {
    // Barreira de arquitetura: sem isto, a regra de dependencia depende de
    // disciplina humana — e disciplina humana degrada.
    //
    // Um sentido so: feature -> common. Um filtro em common/ que importasse de
    // auth/ tornaria os dois inseparaveis, e o envelope de erro deixaria de ser
    // reaproveitavel pelas proximas fatias.
    files: ['src/common/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/auth/**',
                '**/users/**',
                '**/categories/**',
                '**/health/**',
              ],
              message:
                'common/ nao pode depender de uma feature. A dependencia so vale no sentido oposto.',
            },
          ],
        },
      ],
    },
  },
  {
    // Controller so fala HTTP: nem banco, nem repositorio.
    files: ['src/*/*.controller.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/prisma.service',
                '**/generated/prisma/**',
                '**/*.repository',
              ],
              message:
                'Controller nao acessa persistencia. Injete o service da feature.',
            },
          ],
        },
      ],
    },
  },
  {
    /**
     * A regra que faz a camada de repositorio valer algo: SO repositorio toca o
     * Prisma. Sem ela, "temos repositorios" seria uma afirmacao sobre nomes de
     * arquivo — bastaria um `prisma.user.findMany()` dentro de um service para a
     * separacao virar decoracao, e nada acusaria.
     *
     * Duas excecoes, ambas deliberadas:
     *
     *  - prisma.service.ts E' o wrapper do client. Proibi-lo de importar o Prisma
     *    seria proibir a regra de existir;
     *  - health.service.ts: a sonda de readiness verifica a CONEXAO, nao dado de
     *    dominio. Um HealthRepository para um `SELECT 1` seria cerimonia sem
     *    invariante correspondente.
     */
    files: ['src/*/*.service.ts'],
    ignores: ['src/prisma/prisma.service.ts', 'src/health/health.service.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/prisma.service', '**/generated/prisma/client'],
              message:
                'Service nao acessa o Prisma. Toda query vive em um *.repository.ts.',
            },
          ],
        },
      ],
    },
  },
);