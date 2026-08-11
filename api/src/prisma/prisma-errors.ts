import { Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';

const logger = new Logger('PrismaErrors');

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';
const RECORD_NOT_FOUND = 'P2025';

function hasCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

export function isForeignKeyViolation(error: unknown): boolean {
  return hasCode(error, FOREIGN_KEY_VIOLATION);
}

export function isRecordNotFound(error: unknown): boolean {
  return hasCode(error, RECORD_NOT_FOUND);
}

function extractTarget(meta: Record<string, unknown> | undefined): string[] {
  if (!meta) {
    return [];
  }

  const classic = meta['target'];

  if (typeof classic === 'string') {
    return [classic];
  }

  if (Array.isArray(classic)) {
    return classic.filter((item): item is string => typeof item === 'string');
  }

  const cause = (
    meta['driverAdapterError'] as
      | { cause?: Record<string, unknown> }
      | undefined
  )?.cause;

  const constraint = cause?.['constraint'] as
    | { fields?: unknown; index?: unknown }
    | undefined;

  if (Array.isArray(constraint?.fields)) {
    return constraint.fields.filter(
      (item): item is string => typeof item === 'string',
    );
  }

  if (typeof constraint?.index === 'string') {
    return [constraint.index];
  }

  return [];
}

export function isUniqueViolation(error: unknown, column?: string): boolean {
  if (
    !(error instanceof Prisma.PrismaClientKnownRequestError) ||
    error.code !== UNIQUE_VIOLATION
  ) {
    return false;
  }

  if (!column) {
    return true;
  }

  const target = extractTarget(error.meta);

  if (target.length === 0) {
    logger.warn(
      `P2002 sem alvo identificavel; assumindo a coluna "${column}". ` +
        'O formato de meta do Prisma pode ter mudado — conferir prisma-errors.ts. ' +
        `meta recebido: ${JSON.stringify(error.meta)}`,
    );
    return true;
  }

  return target.some(
    (entry) => entry === column || entry.includes(`_${column}_`),
  );
}
