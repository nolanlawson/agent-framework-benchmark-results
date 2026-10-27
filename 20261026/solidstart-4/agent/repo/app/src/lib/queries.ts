import { query } from "@solidjs/router";
import {
  fetchAbility,
  fetchFilterOptions,
  fetchMove,
  fetchPokemon,
  fetchPokemonList,
  fetchPokemonMoves,
  fetchType,
  fetchTypes,
} from "./server";

export const getFilterOptions = query(() => fetchFilterOptions(), "filter-options");

export const getPokemonList = query(
  (q: string, type: string, generation: string, page: number) => fetchPokemonList(q, type, generation, page),
  "pokemon-list",
);

export const getPokemon = query((name: string) => fetchPokemon(name), "pokemon");

export const getPokemonMoves = query(
  (name: string, game: string | undefined) => fetchPokemonMoves(name, game),
  "pokemon-moves",
);

export const getMove = query((name: string) => fetchMove(name), "move");

export const getAbility = query((name: string) => fetchAbility(name), "ability");

export const getTypes = query(() => fetchTypes(), "types");

export const getType = query((name: string) => fetchType(name), "type");
