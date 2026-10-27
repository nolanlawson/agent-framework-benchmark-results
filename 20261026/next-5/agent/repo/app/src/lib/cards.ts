import { getSpeciesNames } from './api';
import { idFromUrl, MAX_SPECIES_ID } from './format';
import type { CardData } from '@/components/PokemonCard';

/**
 * Cards for a list of Pokémon references (which name Pokémon, not species): alternate
 * forms are dropped and each default Pokémon is shown as its species, ordered by dex number.
 */
export async function cardsFor<T extends { url: string }>(
  refs: T[],
  note?: (ref: T) => string | undefined,
): Promise<CardData[]> {
  const speciesNames = await getSpeciesNames();
  const cards = new Map<number, CardData>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!id || id > MAX_SPECIES_ID || cards.has(id)) continue;
    const name = speciesNames.get(id);
    if (!name) continue;
    cards.set(id, { id, name, note: note?.(ref) });
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}
