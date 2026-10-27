import { query } from "@solidjs/router";
import type { HomeFilters } from "./types";

export const getHome = query(async (filters: HomeFilters) => {
  "use server";
  const { homeData } = await import("./server/model");
  return homeData(filters);
}, "home");

export const getPokemon = query(async (name: string) => {
  "use server";
  const { pokemonData } = await import("./server/model");
  return pokemonData(name);
}, "pokemon");

export const getPokemonMoves = query(async (name: string, game: string | null) => {
  "use server";
  const { pokemonMovesData } = await import("./server/model");
  return pokemonMovesData(name, game);
}, "pokemon-moves");

export const getMove = query(async (name: string) => {
  "use server";
  const { moveData } = await import("./server/model");
  return moveData(name);
}, "move");

export const getAbility = query(async (name: string) => {
  "use server";
  const { abilityData } = await import("./server/model");
  return abilityData(name);
}, "ability");

export const getTypeList = query(async () => {
  "use server";
  const { typeListData } = await import("./server/model");
  return typeListData();
}, "types");

export const getType = query(async (name: string) => {
  "use server";
  const { typeData } = await import("./server/model");
  return typeData(name);
}, "type");
