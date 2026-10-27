import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { ApiType } from '../../core/api-types';
import { Catalog, NON_STANDARD_TYPES } from '../../core/catalog';
import { PokeApi } from '../../core/poke-api';
import { PageData } from '../../core/page-data';
import { LinkRef, PokemonCardData, TypeRef } from '../../core/models';
import { englishName, humanize } from '../../core/format';

const RELATIONS: { key: keyof ApiType['damage_relations']; term: string }[] = [
  { key: 'double_damage_to', term: 'Super effective against' },
  { key: 'half_damage_to', term: 'Not very effective against' },
  { key: 'no_damage_to', term: 'No effect against' },
  { key: 'double_damage_from', term: 'Weak to' },
  { key: 'half_damage_from', term: 'Resists' },
  { key: 'no_damage_from', term: 'Immune to' },
];

export interface TypePageData {
  label: string;
  relations: { term: string; types: TypeRef[] }[];
  pokemon: PokemonCardData[];
  moves: LinkRef[];
}

async function loadTypePage(api: PokeApi, catalog: Catalog, name: string): Promise<TypePageData | null> {
  const key = name.toLowerCase();
  if (NON_STANDARD_TYPES.has(key)) return null;
  const type = await api.find<ApiType>(`type/${encodeURIComponent(key)}`);
  if (!type) return null;
  const [typeLabels, speciesNames] = await Promise.all([catalog.typeLabels(), catalog.speciesNames()]);
  const ref = (t: { name: string }) => ({ name: t.name, label: typeLabels.get(t.name) ?? humanize(t.name) });
  return {
    label: englishName(type.names, type.name),
    relations: RELATIONS.map(({ key, term }) => ({ term, types: type.damage_relations[key].map(ref) })),
    pokemon: catalog.pokemonCards(type.pokemon, speciesNames),
    moves: type.moves
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export const typeResolver: ResolveFn<TypePageData | null> = (route) => {
  const api = inject(PokeApi);
  const catalog = inject(Catalog);
  const name = route.paramMap.get('name') ?? '';
  return inject(PageData).load(`type:${name}`, () => loadTypePage(api, catalog, name));
};
