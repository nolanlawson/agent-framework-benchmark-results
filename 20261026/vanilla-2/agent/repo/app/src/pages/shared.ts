import { getSpeciesNames, idFromUrl, type NamedRef } from '../api';
import type { CardData } from '../components';
import type { SafeHtml } from '../html';

/** Pokémon references → species cards ordered by dex number, leaving out alternate forms. */
export async function speciesCards<T extends { pokemon: NamedRef }>(
  refs: T[],
  extra?: (ref: T) => SafeHtml | undefined,
): Promise<CardData[]> {
  const speciesNames = await getSpeciesNames();
  const cards = new Map<number, CardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.pokemon.url);
    const name = speciesNames.get(id);
    if (name && !cards.has(id)) cards.set(id, { id, name, extra: extra?.(ref) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}
