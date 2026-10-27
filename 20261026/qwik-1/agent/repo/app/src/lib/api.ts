// Server-side access to the PokeAPI server. All data is fetched over HTTP at request
// time; responses are cached in memory for a short time to keep pages fast.

import { humanize, padDex, type CardData, type TypeRef } from "./format";

const TTL_MS = 30_000;
const EXCLUDED_TYPES = new Set(["stellar", "unknown", "shadow"]);

export const apiBase = () =>
  (process.env.API_BASE_URL ?? "http://localhost:9000").replace(/\/$/, "");

export class NotFoundError extends Error {}

type Entry = { expires: number; value: Promise<any> };
const cache = new Map<string, Entry>();

/** GET an API path (e.g. `pokemon/25`) or absolute API URL, as JSON. */
export function api<T = any>(pathOrUrl: string): Promise<T> {
  const url = /^https?:/.test(pathOrUrl)
    ? pathOrUrl
    : `${apiBase()}/api/v2/${pathOrUrl.replace(/^\//, "")}`;
  const now = Date.now();
  const hit = cache.get(url);
  if (hit && hit.expires > now) return hit.value;
  const value = (async () => {
    const res = await fetch(url);
    if (res.status === 404) throw new NotFoundError(url);
    if (!res.ok) throw new Error(`API ${res.status} for ${url}`);
    return res.json();
  })();
  cache.set(url, { expires: now + TTL_MS, value });
  value.catch(() => {
    if (cache.get(url)?.value === value) cache.delete(url);
  });
  return value;
}

/** Like `api`, but resolves to null for a 404. */
export async function apiOrNull<T = any>(path: string): Promise<T | null> {
  try {
    return await api<T>(path);
  } catch (err) {
    if (err instanceof NotFoundError) return null;
    throw err;
  }
}

export const idFromUrl = (url: string) => Number(url.match(/\/(\d+)\/?$/)?.[1]);

export const english = (entries: any[] | undefined, key = "name") =>
  entries?.find((e) => e.language?.name === "en")?.[key] as string | undefined;

export const latestEnglishFlavor = (entries: any[] | undefined, key = "flavor_text") => {
  const en = (entries ?? []).filter((e) => e.language?.name === "en");
  const last = en[en.length - 1]?.[key] as string | undefined;
  return last?.replace(/\s+/g, " ").trim();
};

export const spriteUrl = (id: number) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

async function listAll(resource: string) {
  const data = await api(`${resource}/?limit=100000&offset=0`);
  return data.results as { name: string; url: string }[];
}

/** Species id -> species name, for every species. */
export async function speciesIndex() {
  const results = await listAll("pokemon-species");
  const byId = new Map<number, string>();
  for (const r of results) byId.set(idFromUrl(r.url), r.name);
  return byId;
}

export type TypeInfo = { name: string; label: string; data: any };

/** The 18 types, in API order, with their full records. */
export async function allTypes(): Promise<TypeInfo[]> {
  const results = (await listAll("type")).filter((t) => !EXCLUDED_TYPES.has(t.name));
  return Promise.all(
    results.map(async (t) => {
      const data = await api(t.url);
      return { name: t.name, label: english(data.names) ?? humanize(t.name), data };
    }),
  );
}

export async function typeLabels() {
  const types = await allTypes();
  return new Map(types.map((t) => [t.name, t.label]));
}

export const typeRef = (labels: Map<string, string>, name: string): TypeRef => ({
  name,
  label: labels.get(name) ?? humanize(name),
});

/** Turns API Pokémon references into species cards, leaving out alternate forms. */
export async function pokemonCards(
  refs: { name: string; url: string; hidden?: boolean }[],
): Promise<CardData[]> {
  const species = await speciesIndex();
  const seen = new Set<number>();
  const cards: CardData[] = [];
  for (const ref of refs) {
    const id = idFromUrl(ref.url);
    if (!id || id > 10000 || seen.has(id)) continue;
    seen.add(id);
    const name = species.get(id) ?? ref.name;
    cards.push({
      id,
      name,
      label: humanize(name),
      dex: padDex(id),
      sprite: spriteUrl(id),
      ...(ref.hidden !== undefined ? { hidden: ref.hidden } : {}),
    });
  }
  return cards.sort((a, b) => a.id - b.id);
}
