// Shapes of the PokeAPI resources the app reads. Only the fields in use are declared.

export interface NamedResource {
  name: string;
  url: string;
}

export interface ResourceList {
  count: number;
  results: NamedResource[];
}

export interface Name {
  name: string;
  language: NamedResource;
}

export interface FlavorText {
  flavor_text: string;
  language: NamedResource;
}

export interface EffectEntry {
  short_effect: string;
  language: NamedResource;
}

export interface Species {
  id: number;
  name: string;
  names: Name[];
  genera: { genus: string; language: NamedResource }[];
  flavor_text_entries: FlavorText[];
  evolution_chain: { url: string } | null;
  generation: NamedResource;
}

export interface Pokemon {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: { slot: number; type: NamedResource }[];
  abilities: { slot: number; is_hidden: boolean; ability: NamedResource }[];
  stats: { base_stat: number; stat: NamedResource }[];
  sprites: {
    front_default: string | null;
    other?: { 'official-artwork'?: { front_default: string | null } };
  };
  moves: {
    move: NamedResource;
    version_group_details: {
      level_learned_at: number;
      version_group: NamedResource;
      move_learn_method: NamedResource;
    }[];
  }[];
}

export interface EvolutionLink {
  species: NamedResource;
  evolves_to: EvolutionLink[];
}

export interface EvolutionChain {
  id: number;
  chain: EvolutionLink;
}

export interface Move {
  id: number;
  name: string;
  names: Name[];
  type: NamedResource;
  damage_class: NamedResource | null;
  power: number | null;
  accuracy: number | null;
  pp: number | null;
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  learned_by_pokemon: NamedResource[];
}

export interface Ability {
  id: number;
  name: string;
  names: Name[];
  effect_entries: EffectEntry[];
  flavor_text_entries: FlavorText[];
  pokemon: { is_hidden: boolean; slot: number; pokemon: NamedResource }[];
}

export interface Type {
  id: number;
  name: string;
  names: Name[];
  damage_relations: Record<DamageRelation, NamedResource[]>;
  pokemon: { slot: number; pokemon: NamedResource }[];
  moves: NamedResource[];
}

export type DamageRelation =
  | 'double_damage_to'
  | 'half_damage_to'
  | 'no_damage_to'
  | 'double_damage_from'
  | 'half_damage_from'
  | 'no_damage_from';

export interface Generation {
  id: number;
  name: string;
  names: Name[];
  pokemon_species: NamedResource[];
}

export interface VersionGroup {
  id: number;
  name: string;
  order: number;
}
