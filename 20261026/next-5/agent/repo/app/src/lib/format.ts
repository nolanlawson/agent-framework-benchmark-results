// Pure helpers shared by server and client components.

type Named = { name: string; language: { name: string } };

export const MISSING = '—';

export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function englishName(names: Named[] | undefined): string | undefined {
  return names?.find((n) => n.language.name === 'en')?.name;
}

export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function idFromUrl(url: string): number | undefined {
  const m = url.match(/\/(\d+)\/?$/);
  return m ? Number(m[1]) : undefined;
}

export function cleanText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text entry, whitespace collapsed. */
export function latestEnglishFlavorText(
  entries: { flavor_text?: string; text?: string; language: { name: string } }[] | undefined,
): string | undefined {
  const en = (entries ?? []).filter((e) => e.language.name === 'en');
  const last = en.at(-1);
  const text = last?.flavor_text ?? last?.text;
  return text ? cleanText(text) : undefined;
}

export function orMissing(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? MISSING : String(value);
}

/** Alternate forms (IDs above 10000) are out of scope everywhere. */
export const MAX_SPECIES_ID = 10000;
