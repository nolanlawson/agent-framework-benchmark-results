import { englishName, humanize, idFromUrl, isDefaultForm } from '../../core/format';
import { PokeApi, SpeciesRef, TypeLabel } from '../../core/poke-api';

export interface FilterOption {
  name: string;
  label: string;
}

export interface HomeData {
  species: SpeciesRef[];
  types: FilterOption[];
  generations: FilterOption[];
  /** Types of each species' default Pokémon, in slot order. */
  typesBySpecies: Map<number, TypeLabel[]>;
  /** Generation (API name) each species was introduced in. */
  generationBySpecies: Map<number, string>;
}

export interface Filters {
  q: string;
  type: string;
  generation: string;
}

/** Loads everything the list needs: the species, their types and their generations. */
export async function loadHomeData(api: PokeApi): Promise<HomeData> {
  const [species, types, generations] = await Promise.all([api.speciesIndex(), api.types(), api.generations()]);

  const slotted = new Map<number, (TypeLabel & { slot: number })[]>();
  for (const type of types) {
    const label = englishName(type.names, type.name);
    for (const { slot, pokemon } of type.pokemon) {
      if (!isDefaultForm(pokemon)) continue;
      const id = idFromUrl(pokemon.url);
      const list = slotted.get(id) ?? [];
      list.push({ slot, name: type.name, label });
      slotted.set(id, list);
    }
  }
  const typesBySpecies = new Map<number, TypeLabel[]>();
  for (const [id, list] of slotted) {
    typesBySpecies.set(
      id,
      list.sort((a, b) => a.slot - b.slot).map(({ name, label }) => ({ name, label })),
    );
  }

  const generationBySpecies = new Map<number, string>();
  for (const generation of generations) {
    for (const ref of generation.pokemon_species) generationBySpecies.set(idFromUrl(ref.url), generation.name);
  }

  return {
    species,
    types: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
    generations: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) })),
    typesBySpecies,
    generationBySpecies,
  };
}

export function filterSpecies(data: HomeData, filters: Filters): SpeciesRef[] {
  const query = filters.q.trim().toLowerCase();
  return data.species.filter(
    (s) =>
      (!query || humanize(s.name).toLowerCase().includes(query)) &&
      (!filters.type || data.typesBySpecies.get(s.id)?.some((t) => t.name === filters.type)) &&
      (!filters.generation || data.generationBySpecies.get(s.id) === filters.generation),
  );
}
