export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
