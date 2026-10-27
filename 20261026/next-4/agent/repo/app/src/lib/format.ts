// Formatting helpers shared by server and client code.

type Named = { name: string; language: { name: string } };

export const EM_DASH = '—';

export function humanize(name: string) {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export const dexNumber = (id: number) => `#${String(id).padStart(4, '0')}`;

export const englishName = (names: Named[]) => names.find((n) => n.language.name === 'en')?.name;

export function latestEnglishFlavor(entries: { flavor_text: string; language: { name: string } }[]) {
  const english = entries.filter((e) => e.language.name === 'en');
  const last = english[english.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : undefined;
}

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

export const orDash = (value: number | string | null | undefined) => (value == null || value === '' ? EM_DASH : String(value));

export const spriteUrl = (apiBase: string, id: number) => `${apiBase}/media/sprites/pokemon/${id}.png`;
