import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { Catalog } from '../../core/catalog';
import { PageData } from '../../core/page-data';
import { TypeRef } from '../../core/models';
import { englishName, humanize, idFromUrl } from '../../core/format';

/** One species in the home page index. Kept small: all 1,000+ go through TransferState. */
export interface HomeEntry {
  id: number;
  name: string;
  /** Humanized name. */
  label: string;
  /** Type API names in slot order. */
  types: string[];
  generation: string | null;
}

export interface HomeData {
  entries: HomeEntry[];
  types: TypeRef[];
  generations: TypeRef[];
}

/** An index of every species with its types and generation, built from list endpoints. */
async function loadHomeData(catalog: Catalog): Promise<HomeData> {
  const [speciesNames, types, generations] = await Promise.all([
    catalog.speciesNames(),
    catalog.types(),
    catalog.generations(),
  ]);

  // A species' default Pokémon shares its ID, so type membership maps straight to species.
  const typesById = new Map<number, { slot: number; type: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!speciesNames.has(id)) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot, type: type.name });
      typesById.set(id, list);
    }
  }

  const generationById = new Map<number, string>();
  for (const generation of generations) {
    for (const id of generation.speciesIds) generationById.set(id, generation.name);
  }

  const entries = [...speciesNames]
    .sort(([a], [b]) => a - b)
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
      generation: generationById.get(id) ?? null,
    }));

  return {
    entries,
    types: types.map((t) => ({ name: t.name, label: englishName(t.names, t.name) })),
    generations: generations.map(({ name, label }) => ({ name, label })),
  };
}

export const homeResolver: ResolveFn<HomeData> = () => {
  const catalog = inject(Catalog);
  return inject(PageData).load('home', () => loadHomeData(catalog));
};
