export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const humanize = (name: string) =>
  name
    .split('-')
    .map((w) => (w ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(' ');

export const orDash = (value: unknown) => (value === null || value === undefined || value === '' ? '—' : String(value));

export const queryString = (value: unknown): string => {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' ? v : '';
};
