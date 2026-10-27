import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ApiMove } from '../../core/api-types';
import { Catalog } from '../../core/catalog';
import { PokeApi } from '../../core/poke-api';
import { PageData } from '../../core/page-data';
import { PokemonCardData, TypeRef } from '../../core/models';
import { englishName, humanize, latestEnglishFlavorText } from '../../core/format';

export interface MovePageData {
  label: string;
  type: TypeRef;
  category: string | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect: string | null;
  learnedBy: PokemonCardData[];
}

async function loadMovePage(api: PokeApi, catalog: Catalog, name: string): Promise<MovePageData | null> {
  const move = await api.find<ApiMove>(`move/${encodeURIComponent(name.toLowerCase())}`);
  if (!move) return null;
  const [typeLabels, speciesNames] = await Promise.all([catalog.typeLabels(), catalog.speciesNames()]);
  return {
    label: englishName(move.names, move.name),
    type: { name: move.type.name, label: typeLabels.get(move.type.name) ?? humanize(move.type.name) },
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect:
      move.effect_entries.find((e) => e.language.name === 'en')?.short_effect ??
      latestEnglishFlavorText(move.flavor_text_entries),
    learnedBy: catalog.pokemonCards(
      move.learned_by_pokemon.map((pokemon) => ({ pokemon })),
      speciesNames,
    ),
  };
}

export const moveResolver: ResolveFn<MovePageData | null> = (route) => {
  const api = inject(PokeApi);
  const catalog = inject(Catalog);
  const name = route.paramMap.get('name') ?? '';
  return inject(PageData).load(`move:${name}`, () => loadMovePage(api, catalog, name));
};
