import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ApiAbility } from '../../core/api-types';
import { Catalog } from '../../core/catalog';
import { PokeApi } from '../../core/poke-api';
import { PageData } from '../../core/page-data';
import { PokemonCardData } from '../../core/models';
import { englishName, latestEnglishFlavorText } from '../../core/format';

export interface AbilityPageData {
  label: string;
  effect: string | null;
  pokemon: PokemonCardData[];
}

async function loadAbilityPage(api: PokeApi, catalog: Catalog, name: string): Promise<AbilityPageData | null> {
  const ability = await api.find<ApiAbility>(`ability/${encodeURIComponent(name.toLowerCase())}`);
  if (!ability) return null;
  const speciesNames = await catalog.speciesNames();
  return {
    label: englishName(ability.names, ability.name),
    effect:
      ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect ??
      latestEnglishFlavorText(ability.flavor_text_entries),
    pokemon: catalog.pokemonCards(ability.pokemon, speciesNames, (entry) =>
      entry.is_hidden ? { note: 'Hidden ability' } : {},
    ),
  };
}

export const abilityResolver: ResolveFn<AbilityPageData | null> = (route) => {
  const api = inject(PokeApi);
  const catalog = inject(Catalog);
  const name = route.paramMap.get('name') ?? '';
  return inject(PageData).load(`ability:${name}`, () => loadAbilityPage(api, catalog, name));
};
