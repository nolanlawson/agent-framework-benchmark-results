// Server-side access to the PokeAPI server. Every page gets its data from here at
// request time. Responses are cached in memory for a short while so that pages which
// need many records (the home page index, move tables) stay fast.

import type { Card, TypeRef } from "./types";
import { humanize } from "./format";

const CACHE_TTL_MS = 60_000;
const ALL = "?limit=100000";
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);
/** Pokémon IDs above this are alternate forms. */
const MAX_DEFAULT_ID = 10000;

export function apiBase(): string {
  return (process.env.API_BASE_URL || "http://localhost:9000").replace(/\/+$/, "");
}

const cache = new Map<string, { expires: number; value: Promise<any> }>();

/** GETs `/api/v2/<path>`. Resolves to `null` when the resource doesn't exist. */
export function api<T = any>(path: string): Promise<T | null> {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expires > now) return hit.value;

  const value = (async () => {
    const res = await fetch(`${apiBase()}/api/v2/${path}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`API ${path} responded ${res.status}`);
    return res.json();
  })();
  cache.set(path, { expires: now + CACHE_TTL_MS, value });
  value.catch(() => cache.delete(path));
  return value;
}

/** A URL segment from user input, safe to put into an API path. */
export function slug(name: string): string {
  return encodeURIComponent(name.trim().toLowerCase());
}

export function idFromUrl(url: string): number {
  return Number(url.match(/\/(\d+)\/?$/)?.[1] ?? NaN);
}

interface Localized {
  language: { name: string };
}

export function english<T extends Localized>(entries: T[] | undefined): T | undefined {
  return entries?.find((e) => e.language.name === "en");
}

export function englishName(record: { name: string; names?: ({ name: string } & Localized)[] }): string {
  return english(record.names)?.name ?? humanize(record.name);
}

/** The last English flavor text, with whitespace collapsed. */
export function latestFlavorText(
  entries: ({ flavor_text: string } & Localized)[] | undefined,
): string | null {
  const en = (entries ?? []).filter((e) => e.language.name === "en");
  const last = en[en.length - 1];
  return last ? last.flavor_text.replace(/\s+/g, " ").trim() : null;
}

export function spriteUrl(id: number): string {
  return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

/** Species ID → species API name. */
export async function speciesNames(): Promise<Map<number, string>> {
  const list = await api<{ results: { name: string; url: string }[] }>(`pokemon-species/${ALL}`);
  return new Map((list?.results ?? []).map((r) => [idFromUrl(r.url), r.name]));
}

/** Full records of the 18 types, in API order. */
export async function allTypes(): Promise<any[]> {
  const list = await api<{ results: { name: string; url: string }[] }>(`type/${ALL}`);
  const names = (list?.results ?? []).map((r) => r.name).filter((n) => !EXCLUDED_TYPES.has(n));
  const records = await Promise.all(names.map((n) => api(`type/${n}`)));
  return records.filter(Boolean);
}

export async function typeLabels(): Promise<Map<string, string>> {
  return new Map((await allTypes()).map((t) => [t.name, englishName(t)]));
}

export function typeRef(labels: Map<string, string>, name: string): TypeRef {
  return { name, label: labels.get(name) ?? humanize(name) };
}

/** Full generation records, in API order. */
export async function allGenerations(): Promise<any[]> {
  const list = await api<{ results: { name: string }[] }>(`generation/${ALL}`);
  const records = await Promise.all((list?.results ?? []).map((r) => api(`generation/${r.name}`)));
  return records.filter(Boolean);
}

/** Version group name → order. */
export async function versionGroupOrders(): Promise<Map<string, number>> {
  const list = await api<{ results: { name: string }[] }>(`version-group/${ALL}`);
  const records = await Promise.all((list?.results ?? []).map((r) => api(`version-group/${r.name}`)));
  return new Map(records.filter(Boolean).map((vg: any) => [vg.name, vg.order]));
}

/**
 * Cards for a list of Pokémon references (as found in type, move and ability data),
 * mapped to their species, without alternate forms, ordered by dex number.
 */
export async function cardsFor(
  refs: { url: string; hidden?: boolean }[],
): Promise<Card[]> {
  const species = await speciesNames();
  const cards = new Map<number, Card>();
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    const name = species.get(id);
    if (!name || id > MAX_DEFAULT_ID || cards.has(id)) continue;
    const card: Card = { id, name, label: humanize(name), sprite: spriteUrl(id) };
    if (ref.hidden !== undefined) card.hidden = ref.hidden;
    cards.set(id, card);
  }
  return [...cards.values()].sort((a, b) => a.id - b.id);
}

export interface IndexEntry extends Card {
  types: TypeRef[];
  generation: string | null;
}

/** Every species with its default Pokémon's types and its generation. */
export async function speciesIndex(): Promise<IndexEntry[]> {
  const [species, types, generations] = await Promise.all([
    speciesNames(),
    allTypes(),
    allGenerations(),
  ]);

  const typesById = new Map<number, { slot: number; ref: TypeRef }[]>();
  for (const type of types) {
    const ref = { name: type.name, label: englishName(type) };
    for (const entry of type.pokemon ?? []) {
      const id = idFromUrl(entry.pokemon.url);
      if (id > MAX_DEFAULT_ID) continue;
      const list = typesById.get(id) ?? [];
      list.push({ slot: entry.slot, ref });
      typesById.set(id, list);
    }
  }

  const generationById = new Map<number, string>();
  for (const gen of generations) {
    for (const s of gen.pokemon_species ?? []) generationById.set(idFromUrl(s.url), gen.name);
  }

  return [...species.entries()]
    .sort(([a], [b]) => a - b)
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name),
      sprite: spriteUrl(id),
      types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.ref),
      generation: generationById.get(id) ?? null,
    }));
}
