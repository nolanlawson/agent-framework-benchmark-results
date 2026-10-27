import type { Named } from './api';

export const MISSING = '—';

export const humanize = (name: string): string =>
  name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const dexNumber = (id: number): string => `#${String(id).padStart(4, '0')}`;

export const idFromUrl = (url: string): number => Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);

type Localized = { language: Named };

export function english<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.find((entry) => entry.language.name === 'en');
}

export function lastEnglish<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.findLast((entry) => entry.language.name === 'en');
}

export const englishName = (resource: { name: string; names?: ({ name: string } & Localized)[] }): string =>
  english(resource.names)?.name ?? humanize(resource.name);

export const collapseWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();

export function latestFlavorText(entries: ({ flavor_text: string } & Localized)[] | undefined): string | undefined {
  const entry = lastEnglish(entries);
  return entry ? collapseWhitespace(entry.flavor_text) : undefined;
}

export const orMissing = (value: number | string | null | undefined): string =>
  value == null || value === '' ? MISSING : String(value);
