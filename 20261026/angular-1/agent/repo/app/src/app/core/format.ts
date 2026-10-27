import { FlavorText, Name, NamedResource } from './models';

/** `mr-mime` → `Mr Mime`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `25` → `#0025`. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(names: Name[], fallback: string): string {
  return names.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text entry, whitespace collapsed. */
export function latestEnglishFlavorText(entries: FlavorText[]): string | null {
  const english = entries.filter((e) => e.language.name === 'en');
  const last = english[english.length - 1];
  return last ? collapseWhitespace(last.flavor_text) : null;
}

/** Numeric ID at the end of a PokeAPI resource URL (`.../pokemon/25/` → 25). */
export function idFromUrl(url: string): number {
  const match = /\/(\d+)\/?$/.exec(url);
  return match ? Number(match[1]) : NaN;
}

/** Alternate forms (Mega Evolutions etc.) have Pokémon IDs above 10000. */
export const MAX_SPECIES_ID = 10000;

export function isDefaultForm(ref: NamedResource): boolean {
  return idFromUrl(ref.url) <= MAX_SPECIES_ID;
}

export const MISSING = '—';

export function orMissing(value: number | string | null | undefined): string {
  return value === null || value === undefined || value === '' ? MISSING : String(value);
}
