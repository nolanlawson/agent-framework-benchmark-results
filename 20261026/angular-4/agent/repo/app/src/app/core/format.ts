import { FlavorTextEntry, LocalizedName } from './api-types';

/** Placeholder for values the API doesn't have, such as a status move's power. */
export const MISSING = '—';

/** `mr-mime` → `Mr Mime`. */
export function humanize(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** `25` → `#0025`. */
export function dexNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function englishName(names: readonly LocalizedName[] | undefined, fallback: string): string {
  return names?.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** The last English flavor text entry, with whitespace collapsed. */
export function latestEnglishFlavorText(entries: readonly FlavorTextEntry[] | undefined): string | null {
  const english = entries?.filter((e) => e.language.name === 'en') ?? [];
  const last = english.at(-1);
  return last ? collapseWhitespace(last.flavor_text) : null;
}

/** Numeric ID at the end of an API URL (`…/pokemon/25/` → `25`). */
export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

/** Runs `fn` over `items` with at most `limit` calls in flight, preserving order. */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
