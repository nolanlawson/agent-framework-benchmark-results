// Router queries backed by server functions. The API is only ever called from the server.
import { query } from "@solidjs/router";
import {
  abilityDetail,
  apiBase,
  learnset,
  moveDetail,
  pokedexIndex,
  pokemonDetail,
  typeDetail,
  typeIndex,
} from "./data.server";

export const getMediaBase = query(async () => {
  "use server";
  return apiBase();
}, "media-base");

export const getPokedexIndex = query(async () => {
  "use server";
  return pokedexIndex();
}, "pokedex-index");

export const getTypes = query(async () => {
  "use server";
  return typeIndex();
}, "types");

export const getPokemon = query(async (name: string) => {
  "use server";
  return pokemonDetail(name);
}, "pokemon");

export const getLearnset = query(async (pokemon: string, game: string) => {
  "use server";
  return learnset(pokemon, game);
}, "learnset");

export const getMove = query(async (name: string) => {
  "use server";
  return moveDetail(name);
}, "move");

export const getAbility = query(async (name: string) => {
  "use server";
  return abilityDetail(name);
}, "ability");

export const getType = query(async (name: string) => {
  "use server";
  return typeDetail(name);
}, "type");
