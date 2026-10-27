/** `#0025` */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export const MISSING = '—';

export function orMissing(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? MISSING : String(value);
}
