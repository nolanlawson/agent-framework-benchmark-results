/** Minimal shapes of the PokeAPI resources the app reads. */

export interface NamedRef {
  name: string;
  url: string;
}

export interface NamedList {
  count: number;
  results: NamedRef[];
}

export interface LocalizedName {
  name: string;
  language: NamedRef;
}

export interface FlavorTextEntry {
  flavor_text: string;
  language: NamedRef;
}

export interface EffectEntry {
  effect: string;
  short_effect: string;
  language: NamedRef;
}

export interface ApiType {
  id: number;
  name: string;
  names: LocalizedName[];
  damage_relations: Record<
    | 'double_damage_to'
    | 'half_damage_to'
    | 'no_damage_to'
    | 'double_damage_from'
    | 'half_damage_from'
    | 'no_damage_from',
    NamedRef[]
  >;
  pokemon: { slot: number; pokemon: NamedRef }[];
  moves: NamedRef[];
}

export interface ApiGeneration {
  id: number;
  name: string;
  names: LocalizedName[];
  pokemon_species: NamedRef[];
}

export interface ApiSpecies {
  id: number;
  name: string;
  names: LocalizedName[];
  genera: { genus: string; language: NamedRef }[];
  flavor_text_entries: FlavorTextEntry[];
  evolution_chain: { url: string } | null;
  varieties: { is_default: boolean; pokemon: NamedRef }[];
}

export interface ApiPokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedRef }[];
  abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[];
  stats: { base_stat: number; stat: NamedRef }[];
  sprites: {
    front_default: string | null;
    other?: Record<string, { front_default?: string | null } | undefined>;
  };
  moves: {
    move: NamedRef;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedRef;
      move_learn_method: NamedRef;
    }[];
  }[];
}

export interface ApiChainLink {
  species: NamedRef;
  evolves_to: ApiChainLink[];
}

export interface ApiEvolutionChain {
  id: number;
  chain: ApiChainLink;
}

export interface ApiMove {
  id: number;
  name: string;
  names: LocalizedName[];
  accuracy: number | null;
  power: number | null;
  pp: number | null;
  damage_class: NamedRef | null;
  type: NamedRef;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorTextEntry[];
  learned_by_pokemon: NamedRef[];
}

export interface ApiAbility {
  id: number;
  name: string;
  names: LocalizedName[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorTextEntry[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedRef }[];
}

export interface ApiVersionGroup {
  id: number;
  name: string;
  order: number;
}
