// Data access for the routes. Every function runs on the server ("use server"), so the
// browser only ever receives the compact, page-ready data.

import { query } from "@solidjs/router";
import * as pokedex from "~/server/pokedex";

export const getFilterOptions = query(async () => {
  "use server";
  return pokedex.filterOptions();
}, "filter-options");

export const getPokemonList = query(async (q: string, type: string, generation: string, page: number) => {
  "use server";
  return pokedex.pokemonList(q, type, generation, page);
}, "pokemon-list");

export const getPokemon = query(async (name: string) => {
  "use server";
  return pokedex.pokemonPage(name);
}, "pokemon");

export const getPokemonMoves = query(async (name: string, game: string) => {
  "use server";
  return pokedex.pokemonMoves(name, game);
}, "pokemon-moves");

export const getMove = query(async (name: string) => {
  "use server";
  return pokedex.movePage(name);
}, "move");

export const getAbility = query(async (name: string) => {
  "use server";
  return pokedex.abilityPage(name);
}, "ability");

export const getTypes = query(async () => {
  "use server";
  return pokedex.typeList();
}, "types");

export const getType = query(async (name: string) => {
  "use server";
  return pokedex.typePage(name);
}, "type");
