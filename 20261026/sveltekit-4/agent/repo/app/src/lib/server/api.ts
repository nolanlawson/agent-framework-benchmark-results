// Access to the PokeAPI server. Everything is fetched over HTTP at request time; responses
// are cached in memory for a short while so a page that needs dozens of resources stays fast.

import { humanize, type Card, type TypeRef } from '../util.ts';

const CACHE_TTL_MS = 60_000;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
/** Pokémon IDs above this are alternate forms. */
const MAX_DEFAULT_ID = 10000;

export function apiBase(): string {
	return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/$/, '');
}

interface CacheEntry {
	expires: number;
	value: Promise<unknown>;
}
const cache = new Map<string, CacheEntry>();

/** Turns an API path (`pokemon/25`) or an absolute API URL into a fetchable URL. */
function resolveUrl(pathOrUrl: string): string {
	const match = pathOrUrl.match(/\/api\/v2\/(.*)$/);
	const path = (match ? match[1] : pathOrUrl).replace(/^\/+/, '');
	return `${apiBase()}/api/v2/${path}`;
}

/** Fetches an API resource. Resolves to `null` if the API responds with 404. */
export function get<T = any>(pathOrUrl: string): Promise<T | null> {
	const url = resolveUrl(pathOrUrl);
	const now = Date.now();
	const hit = cache.get(url);
	if (hit && hit.expires > now) return hit.value as Promise<T | null>;

	const value = (async () => {
		const res = await fetch(url, { headers: { accept: 'application/json' } });
		if (res.status === 404) {
			await res.body?.cancel();
			return null;
		}
		if (!res.ok) {
			await res.body?.cancel();
			throw new Error(`API request failed: ${res.status} ${url}`);
		}
		return (await res.json()) as T;
	})();
	cache.set(url, { expires: now + CACHE_TTL_MS, value });
	value.catch(() => {
		if (cache.get(url)?.value === value) cache.delete(url);
	});
	return value;
}

export async function getOrThrow<T = any>(pathOrUrl: string): Promise<T> {
	const value = await get<T>(pathOrUrl);
	if (value === null) throw new Error(`Missing API resource: ${pathOrUrl}`);
	return value;
}

export function idFromUrl(url: string): number {
	return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

interface Named {
	name: string;
	url: string;
}
interface Localized {
	language: { name: string };
}

export function englishName(resource: { name: string; names?: (Localized & { name: string })[] }): string {
	return resource.names?.find((n) => n.language.name === 'en')?.name ?? humanize(resource.name);
}

export function englishEntry<T extends Localized>(entries: T[] | undefined, last = false): T | undefined {
	const en = (entries ?? []).filter((e) => e.language.name === 'en');
	return last ? en[en.length - 1] : en[0];
}

export function collapse(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

export function latestFlavorText(entries: (Localized & { flavor_text: string })[] | undefined): string | undefined {
	const entry = englishEntry(entries, true);
	return entry ? collapse(entry.flavor_text) : undefined;
}

export async function getList(resource: string): Promise<Named[]> {
	const list = await getOrThrow<{ results: Named[] }>(`${resource}/?limit=100000`);
	return list.results;
}

export function spriteUrl(id: number): string {
	return `${apiBase()}/media/sprites/pokemon/${id}.png`;
}

// ---------------------------------------------------------------------------
// Indexes built from list endpoints

export interface Species {
	id: number;
	name: string;
	label: string;
}

export async function getSpecies(): Promise<{ list: Species[]; byId: Map<number, Species> }> {
	const results = await getList('pokemon-species');
	const list = results
		.map((r) => ({ id: idFromUrl(r.url), name: r.name, label: humanize(r.name) }))
		.sort((a, b) => a.id - b.id);
	return { list, byId: new Map(list.map((s) => [s.id, s])) };
}

export interface TypeInfo extends TypeRef {
	id: number;
	data: any;
}

export interface TypeIndex {
	types: TypeInfo[];
	labels: Map<string, string>;
	/** Pokémon ID → type names in slot order. */
	byPokemon: Map<number, string[]>;
}

export async function getTypes(): Promise<TypeIndex> {
	const results = (await getList('type')).filter((t) => !EXCLUDED_TYPES.has(t.name));
	const details = await Promise.all(results.map((t) => getOrThrow(t.url)));
	const types: TypeInfo[] = details.map((data) => ({
		id: data.id,
		name: data.name,
		label: englishName(data),
		data
	}));
	const labels = new Map(types.map((t) => [t.name, t.label]));
	const slots = new Map<number, { slot: number; name: string }[]>();
	for (const t of types) {
		for (const p of t.data.pokemon as { slot: number; pokemon: Named }[]) {
			const id = idFromUrl(p.pokemon.url);
			if (!slots.has(id)) slots.set(id, []);
			slots.get(id)!.push({ slot: p.slot, name: t.name });
		}
	}
	const byPokemon = new Map<number, string[]>();
	for (const [id, entries] of slots) {
		byPokemon.set(
			id,
			entries.sort((a, b) => a.slot - b.slot).map((e) => e.name)
		);
	}
	return { types, labels, byPokemon };
}

export function typeRef(index: TypeIndex, name: string): TypeRef {
	return { name, label: index.labels.get(name) ?? humanize(name) };
}

export interface GenerationInfo {
	name: string;
	label: string;
	species: Set<number>;
}

export async function getGenerations(): Promise<GenerationInfo[]> {
	const results = await getList('generation');
	const details = await Promise.all(results.map((g) => getOrThrow(g.url)));
	return details
		.sort((a, b) => a.id - b.id)
		.map((g) => ({
			name: g.name,
			label: englishName(g),
			species: new Set((g.pokemon_species as Named[]).map((s) => idFromUrl(s.url)))
		}));
}

/**
 * Maps a list of Pokémon references to species cards, leaving out alternate forms and
 * sorting by dex number.
 */
export async function pokemonCards<T extends { pokemon: Named }>(
	entries: T[],
	extra?: (entry: T) => Partial<Card>
): Promise<Card[]> {
	const { byId } = await getSpecies();
	const seen = new Set<number>();
	const cards: Card[] = [];
	for (const entry of entries) {
		const id = idFromUrl(entry.pokemon.url);
		if (!(id <= MAX_DEFAULT_ID) || seen.has(id)) continue;
		seen.add(id);
		const species = byId.get(id);
		const name = species?.name ?? entry.pokemon.name;
		cards.push({ id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(entry) });
	}
	return cards.sort((a, b) => a.id - b.id);
}
