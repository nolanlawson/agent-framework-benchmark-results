import { data } from "react-router";
import { apiBaseUrl, get, getList, getOrNull, idFromUrl } from "./api.server";
import { humanize } from "./format";
import type { Card, TypeRef } from "~/components/ui";

type Named = { name: string; url: string };
type Localized = { language: { name: string } };

export const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const MAX_DEFAULT_ID = 9999;

export function notFound(): never {
  throw data("Not found", { status: 404 });
}

export async function getOr404<T = any>(path: string): Promise<T> {
  return (await getOrNull<T>(path)) ?? notFound();
}

export function english<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === "en");
}

export function englishName(resource: { name: string; names?: ({ name: string } & Localized)[] }) {
  return english(resource.names)?.name ?? humanize(resource.name);
}

export function latestEnglishFlavorText(entries: ({ flavor_text: string } & Localized)[] | undefined) {
  const en = (entries ?? []).filter((e) => e.language.name === "en");
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, " ").trim() : undefined;
}

export function spriteUrl(id: number) {
  return `${apiBaseUrl()}/media/sprites/pokemon/${id}.png`;
}


/** Species ID -> species name, for every species. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
  const list = await getList("pokemon-species");
  return new Map(list.map((s) => [idFromUrl(s.url), s.name]));
}

/** The 18 types in API order, with their full records. */
export async function getTypes() {
  const list = (await getList("type")).filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(list.map((t) => get(t.url)));
}

export async function getTypeLabels(): Promise<Map<string, string>> {
  const types = await getTypes();
  return new Map(types.map((t) => [t.name as string, englishName(t)]));
}

export function typeRef(name: string, labels: Map<string, string>): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) };
}

/**
 * Cards for a list of Pokémon references: alternate forms dropped, mapped to their
 * species, de-duplicated and ordered by dex number.
 */
export async function cardsFor<T>(
  entries: T[],
  pokemonOf: (entry: T) => Named,
  extra?: (entry: T) => Partial<Card>,
): Promise<Card[]> {
  const species = await getSpeciesNames();
  const byId = new Map<number, Card>();
  for (const entry of entries) {
    const id = idFromUrl(pokemonOf(entry).url);
    if (!(id <= MAX_DEFAULT_ID) || byId.has(id)) continue;
    const name = species.get(id) ?? pokemonOf(entry).name;
    byId.set(id, { id, name, sprite: spriteUrl(id), ...extra?.(entry) });
  }
  return [...byId.values()].sort((a, b) => a.id - b.id);
}
