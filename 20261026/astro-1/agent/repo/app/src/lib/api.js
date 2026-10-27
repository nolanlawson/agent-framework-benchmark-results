import { englishName, humanize, idFromUrl } from './format.js';

// Read at request time so the same build can point at any API server.
export const apiBase = () => (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');

// Small in-memory cache: the API is a live service, so entries expire quickly.
// Concurrent requests for the same resource share one fetch.
const TTL_MS = 60_000;
const MAX_ENTRIES = 1500;
const cache = new Map();

export class ApiError extends Error {}

async function load(path) {
  const res = await fetch(`${apiBase()}/api/v2/${path}`);
  if (res.status === 404) {
    await res.body?.cancel();
    return null;
  }
  if (!res.ok) throw new ApiError(`API ${res.status} for ${path}`);
  return res.json();
}

export function getJSON(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expires > now) return hit.promise;
  const promise = load(path);
  cache.delete(path);
  cache.set(path, { expires: now + TTL_MS, promise });
  promise.catch(() => cache.delete(path));
  // Map keeps insertion order, so the first keys are the oldest.
  for (const key of cache.keys()) {
    if (cache.size <= MAX_ENTRIES) break;
    cache.delete(key);
  }
  return promise;
}

// Lookup by API name. Rejects anything that isn't a plain name so it can't reach other endpoints.
export function getByName(resource, name) {
  if (!/^[a-z0-9-]+$/i.test(name ?? '')) return Promise.resolve(null);
  return getJSON(`${resource}/${name.toLowerCase()}/`);
}

// Path of an absolute API URL relative to /api/v2/.
export const apiPath = (url) => url.replace(/^.*\/api\/v2\//, '');

export const spriteUrl = (id) => `${apiBase()}/media/sprites/pokemon/${id}.png`;

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export async function getSpeciesList() {
  const list = await getJSON('pokemon-species/?limit=100000');
  return list.results
    .map((s) => ({ id: idFromUrl(s.url), name: s.name, display: humanize(s.name) }))
    .filter((s) => Number.isFinite(s.id))
    .sort((a, b) => a.id - b.id);
}

export async function getSpeciesById() {
  return new Map((await getSpeciesList()).map((s) => [s.id, s]));
}

// The 18 types, in API order, with their full records.
export async function getTypes() {
  const list = await getJSON('type/?limit=1000');
  const refs = list.results.filter((t) => !EXCLUDED_TYPES.has(t.name));
  const records = await Promise.all(refs.map((t) => getJSON(apiPath(t.url))));
  return refs
    .map((t, i) => records[i] && { name: t.name, label: englishName(records[i]), record: records[i] })
    .filter(Boolean);
}

export async function getTypeLabels() {
  return new Map((await getTypes()).map((t) => [t.name, t.label]));
}

export const typeLabel = (labels, name) => labels.get(name) ?? humanize(name);

// Pokémon ID -> type names in slot order, built from the type records.
export async function getPokemonTypes() {
  const byPokemon = new Map();
  for (const type of await getTypes()) {
    for (const { slot, pokemon } of type.record.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!byPokemon.has(id)) byPokemon.set(id, []);
      byPokemon.get(id).push({ slot, name: type.name });
    }
  }
  const result = new Map();
  for (const [id, slots] of byPokemon) result.set(id, slots.sort((a, b) => a.slot - b.slot).map((s) => s.name));
  return result;
}

export async function getGenerations() {
  const list = await getJSON('generation/?limit=1000');
  const records = await Promise.all(list.results.map((g) => getJSON(apiPath(g.url))));
  return records
    .filter(Boolean)
    .sort((a, b) => a.id - b.id)
    .map((g) => ({
      name: g.name,
      label: englishName(g),
      speciesIds: new Set(g.pokemon_species.map((s) => idFromUrl(s.url))),
    }));
}

// Card data for a Pokémon reference ({ name, url }); null for alternate forms.
export function cardFor(ref, speciesById) {
  const id = idFromUrl(ref.url);
  if (!(id < 10000)) return null;
  const species = speciesById.get(id);
  const name = species?.name ?? ref.name;
  return { id, name, display: humanize(name) };
}

export async function cardsFor(refs, extra = () => ({})) {
  const speciesById = await getSpeciesById();
  const seen = new Set();
  const cards = [];
  for (const ref of refs) {
    const card = cardFor(ref.pokemon ?? ref, speciesById);
    if (!card || seen.has(card.id)) continue;
    seen.add(card.id);
    cards.push({ ...card, ...extra(ref) });
  }
  return cards.sort((a, b) => a.id - b.id);
}

// Runs fn over items with limited concurrency.
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
