import { Service, inject } from '@angular/core';
import { API_BASE_URL } from './api-config';
import { englishName, idFromUrl, isDefaultForm, MAX_SPECIES_ID } from './format';
import {
  Ability,
  EvolutionChain,
  Generation,
  Move,
  NamedResource,
  Pokemon,
  ResourceList,
  Species,
  Type,
  VersionGroup,
} from './models';

/** Thrown when the API has no such resource (HTTP 404). */
export class NotFoundError extends Error {
  constructor(path: string) {
    super(`Not found: ${path}`);
    this.name = 'NotFoundError';
  }
}

export interface SpeciesRef {
  id: number;
  name: string;
}

/** What a Pokémon card shows. `name` is the species' API name. */
export interface CardData {
  id: number;
  name: string;
  types?: TypeLabel[];
  hiddenAbility?: boolean;
}

export interface TypeLabel {
  name: string;
  label: string;
}

/** Types that exist in the API but aren't among the 18 the app covers. */
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

/** The API is treated as live data, so cached responses expire after a while. */
const CACHE_TTL_MS = 5 * 60 * 1000;

/** Larger than any list in the API, to fetch a whole list in one request. */
const ALL = 100000;

@Service()
export class PokeApi {
  readonly baseUrl = inject(API_BASE_URL);
  private readonly cache = new Map<string, { expires: number; value: Promise<unknown> }>();

  /** GETs an API path (`pokemon/25`) or an absolute API URL, sharing in-flight and recent requests. */
  get<T>(pathOrUrl: string): Promise<T> {
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.baseUrl}/api/v2/${pathOrUrl.replace(/^\/+/, '')}`;
    const now = Date.now();
    const hit = this.cache.get(url);
    if (hit && hit.expires > now) return hit.value as Promise<T>;

    const value = fetch(url).then(async (res) => {
      if (res.status === 404) throw new NotFoundError(pathOrUrl);
      if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
      return (await res.json()) as T;
    });
    this.cache.set(url, { expires: now + CACHE_TTL_MS, value });
    value.catch(() => this.cache.delete(url));
    return value;
  }

  /** Looks up a resource by API name. Names never contain slashes, but encode them anyway. */
  private byName<T>(resource: string, name: string): Promise<T> {
    if (!name || /[^a-z0-9-]/i.test(name)) return Promise.reject(new NotFoundError(`${resource}/${name}`));
    return this.get<T>(`${resource}/${encodeURIComponent(name.toLowerCase())}/`);
  }

  species(name: string): Promise<Species> {
    return this.byName('pokemon-species', name);
  }

  pokemon(idOrName: number | string): Promise<Pokemon> {
    return this.get(`pokemon/${idOrName}/`);
  }

  move(name: string): Promise<Move> {
    return this.byName('move', name);
  }

  ability(name: string): Promise<Ability> {
    return this.byName('ability', name);
  }

  type(name: string): Promise<Type> {
    return this.byName('type', name);
  }

  versionGroup(name: string): Promise<VersionGroup> {
    return this.byName('version-group', name);
  }

  evolutionChain(url: string): Promise<EvolutionChain> {
    return this.get(url);
  }

  /** Every species, ordered by dex number. */
  async speciesIndex(): Promise<SpeciesRef[]> {
    const list = await this.get<ResourceList>(`pokemon-species/?limit=${ALL}`);
    return list.results
      .map((r) => ({ id: idFromUrl(r.url), name: r.name }))
      .filter((s) => s.id > 0 && s.id <= MAX_SPECIES_ID)
      .sort((a, b) => a.id - b.id);
  }

  /** The 18 types, in API order. */
  async types(): Promise<Type[]> {
    const list = await this.get<ResourceList>(`type/?limit=${ALL}`);
    return Promise.all(list.results.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => this.type(t.name)));
  }

  /** Every generation, in API order. */
  async generations(): Promise<Generation[]> {
    const list = await this.get<ResourceList>(`generation/?limit=${ALL}`);
    return Promise.all(list.results.map((g) => this.get<Generation>(g.url)));
  }

  /** English labels for type references, e.g. a Pokémon's types or a type's damage relations. */
  async typeLabels(refs: NamedResource[]): Promise<TypeLabel[]> {
    return Promise.all(
      refs.map(async (ref) => {
        const type = await this.type(ref.name).catch(() => null);
        return { name: ref.name, label: englishName(type?.names ?? [], ref.name) };
      }),
    );
  }

  /**
   * Cards for a list of Pokémon references: alternate forms are left out and each
   * Pokémon is shown as its species (`deoxys-normal` → `deoxys`), ordered by dex number.
   */
  async cardsFor<T extends { pokemon: NamedResource }>(
    entries: T[],
    extra: (entry: T) => Partial<CardData> = () => ({}),
  ): Promise<CardData[]> {
    const speciesNames = new Map((await this.speciesIndex()).map((s) => [s.id, s.name]));
    const cards = new Map<number, CardData>();
    for (const entry of entries) {
      if (!isDefaultForm(entry.pokemon)) continue;
      const id = idFromUrl(entry.pokemon.url);
      if (!cards.has(id)) cards.set(id, { id, name: speciesNames.get(id) ?? entry.pokemon.name, ...extra(entry) });
    }
    return [...cards.values()].sort((a, b) => a.id - b.id);
  }

  /** Front sprite of a (default-form) Pokémon. */
  spriteUrl(id: number): string {
    return `${this.baseUrl}/media/sprites/pokemon/${id}.png`;
  }

  /** Makes a media URL from the API absolute. They already are, but be lenient. */
  mediaUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    return url.startsWith('/') ? `${this.baseUrl}${url}` : url;
  }
}
