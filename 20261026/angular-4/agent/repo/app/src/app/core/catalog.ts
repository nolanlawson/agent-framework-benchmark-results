import { Service, inject } from '@angular/core';
import { ApiGeneration, ApiType, NamedRef } from './api-types';
import { englishName, humanize, idFromUrl } from './format';
import { PokeApi } from './poke-api';
import { PokemonCardData, TypeRef } from './models';

/** Types the API lists that aren't one of the 18 types. */
export const NON_STANDARD_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const MAX_DEFAULT_POKEMON_ID = 10_000;

export interface GenerationInfo {
  name: string;
  label: string;
  speciesIds: number[];
}

/** Reference data shared by several pages, assembled from API responses. */
@Service()
export class Catalog {
  private readonly api = inject(PokeApi);

  /** Species ID → species API name, for every species the API lists. */
  async speciesNames(): Promise<Map<number, string>> {
    const results = await this.api.list('pokemon-species');
    return new Map(results.map((r) => [idFromUrl(r.url), r.name]));
  }

  /** The 18 types, in API order. */
  async types(): Promise<ApiType[]> {
    const results = await this.api.list('type');
    return Promise.all(
      results
        .filter((r) => !NON_STANDARD_TYPES.has(r.name))
        .map((r) => this.api.get<ApiType>(`type/${r.name}`)),
    );
  }

  async typeRefs(): Promise<TypeRef[]> {
    return (await this.types()).map((t) => ({ name: t.name, label: englishName(t.names, t.name) }));
  }

  /** Type API name → English name. */
  async typeLabels(): Promise<Map<string, string>> {
    return new Map((await this.typeRefs()).map((t) => [t.name, t.label]));
  }

  async generations(): Promise<GenerationInfo[]> {
    const results = await this.api.list('generation');
    const generations = await Promise.all(
      results.map((r) => this.api.get<ApiGeneration>(`generation/${r.name}`)),
    );
    return generations.map((g) => ({
      name: g.name,
      label: englishName(g.names, g.name),
      speciesIds: g.pokemon_species.map((s) => idFromUrl(s.url)),
    }));
  }

  spriteUrl(pokemonId: number): string {
    return this.api.media(`sprites/pokemon/${pokemonId}.png`);
  }

  card(id: number, speciesName: string, extra: Partial<PokemonCardData> = {}): PokemonCardData {
    return {
      id,
      name: speciesName,
      label: humanize(speciesName),
      sprite: this.spriteUrl(id),
      ...extra,
    };
  }

  /**
   * Cards for Pokémon references (as found in type, move and ability data), mapped to their
   * species, without alternate forms, ordered by dex number.
   */
  pokemonCards<T extends { pokemon: NamedRef }>(
    entries: readonly T[],
    speciesNames: Map<number, string>,
    extra: (entry: T) => Partial<PokemonCardData> = () => ({}),
  ): PokemonCardData[] {
    const cards = new Map<number, PokemonCardData>();
    for (const entry of entries) {
      const id = idFromUrl(entry.pokemon.url);
      const species = speciesNames.get(id);
      if (id > MAX_DEFAULT_POKEMON_ID || !species || cards.has(id)) continue;
      cards.set(id, this.card(id, species, extra(entry)));
    }
    return [...cards.values()].sort((a, b) => a.id - b.id);
  }
}
