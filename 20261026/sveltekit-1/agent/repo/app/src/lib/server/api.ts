import { error } from '@sveltejs/kit';
import { API_BASE_URL } from '$app/env/private';
import { humanize } from '#lib/format.ts';
import type { Card, TypeRef } from '#lib/types.ts';

// Responses are cached briefly in memory: the API is treated as live data, but a page
// needs dozens of records and the same ones are requested over and over.
const TTL_MS = 60_000;
const cache = new Map<string, { expires: number; value: Promise<unknown> }>();

export interface NamedRef {
	name: string;
	url: string;
}

interface Localized {
	language: NamedRef;
}

function resolveUrl(pathOrUrl: string): string {
	if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
	if (pathOrUrl.startsWith('/')) return API_BASE_URL + pathOrUrl;
	return `${API_BASE_URL}/api/v2/${pathOrUrl}`;
}

/** Fetches an API resource, returning `null` if it doesn't exist. */
export function fetchApi<T>(pathOrUrl: string): Promise<T | null> {
	const url = resolveUrl(pathOrUrl);
	const now = Date.now();
	const hit = cache.get(url);
	if (hit && hit.expires > now) return hit.value as Promise<T | null>;

	const value = (async () => {
		let res: Response;
		try {
			res = await fetch(url);
		} catch (err) {
			console.error(`Fetching ${url} failed`, err);
			error(503, 'The Pokémon data service is unavailable');
		}
		if (res.status === 404) return null;
		if (!res.ok) error(502, `The Pokémon data service responded with ${res.status}`);
		return (await res.json()) as T;
	})();
	cache.set(url, { expires: now + TTL_MS, value });
	value.catch(() => cache.delete(url));
	if (cache.size > 5000) {
		for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
	}
	return value;
}

/** Fetches an API resource, or responds with a 404 page if it doesn't exist. */
export async function fetchOr404<T>(pathOrUrl: string): Promise<T> {
	const value = await fetchApi<T>(pathOrUrl);
	if (value === null) error(404, 'Not found');
	return value;
}

/** Looks up a resource by the name in a page URL. */
export function fetchByName<T>(resource: string, name: string): Promise<T> {
	if (!/^[a-z0-9-]+$/i.test(name)) error(404, 'Not found');
	return fetchOr404<T>(`${resource}/${encodeURIComponent(name.toLowerCase())}/`);
}

export function idFromUrl(url: string): number {
	return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

export function english<T extends Localized>(entries: T[] | undefined): T | undefined {
	return entries?.find((entry) => entry.language.name === 'en');
}

export function lastEnglish<T extends Localized>(entries: T[] | undefined): T | undefined {
	return entries?.findLast((entry) => entry.language.name === 'en');
}

export function englishName(names: { name: string; language: NamedRef }[] | undefined, fallback: string) {
	return english(names)?.name ?? humanize(fallback);
}

export function cleanText(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

export function spriteUrl(id: number): string {
	return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

interface ListResponse {
	count: number;
	results: NamedRef[];
}

async function fetchList(resource: string): Promise<NamedRef[]> {
	const list = await fetchOr404<ListResponse>(`${resource}/?limit=100000`);
	return list.results;
}

// ---------------------------------------------------------------------------------------
// Species

/** Species ID → species name, for every species the API lists. */
export async function getSpeciesNames(): Promise<Map<number, string>> {
	const results = await fetchList('pokemon-species');
	return new Map(results.map((entry) => [idFromUrl(entry.url), entry.name]));
}

// Alternate forms have IDs above this; a default Pokémon shares its species' ID.
const MAX_SPECIES_ID = 10000;

export interface PokemonRef {
	pokemon: NamedRef;
	is_hidden?: boolean;
}

/**
 * Turns references to Pokémon (as found on types, moves and abilities) into species
 * cards, ordered by dex number. Alternate forms are left out.
 */
export async function cardsFor(refs: PokemonRef[]): Promise<Card[]> {
	const species = await getSpeciesNames();
	const cards = new Map<number, Card>();
	for (const ref of refs) {
		const id = idFromUrl(ref.pokemon.url);
		const name = species.get(id);
		if (!name || id > MAX_SPECIES_ID || cards.has(id)) continue;
		const card: Card = { id, name, label: humanize(name), sprite: spriteUrl(id) };
		if (ref.is_hidden !== undefined) card.hidden = ref.is_hidden;
		cards.set(id, card);
	}
	return [...cards.values()].sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------------------
// Types

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

export interface TypeDetail {
	id: number;
	name: string;
	names: { name: string; language: NamedRef }[];
	damage_relations: Record<string, NamedRef[]>;
	pokemon: { slot: number; pokemon: NamedRef }[];
	moves: NamedRef[];
}

/** The 18 types, in API order. */
export async function getTypes(): Promise<TypeDetail[]> {
	const list = await fetchList('type');
	const types = await Promise.all(
		list.filter((t) => !EXCLUDED_TYPES.has(t.name)).map((t) => fetchApi<TypeDetail>(t.url))
	);
	return types.filter((t): t is TypeDetail => t !== null);
}

export async function getTypeLabels(): Promise<Map<string, string>> {
	const types = await getTypes();
	return new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));
}

export function typeRef(name: string, labels: Map<string, string>): TypeRef {
	return { name, label: labels.get(name) ?? humanize(name) };
}

export function isListedType(name: string): boolean {
	return !EXCLUDED_TYPES.has(name);
}

// ---------------------------------------------------------------------------------------
// Generations

export interface GenerationDetail {
	id: number;
	name: string;
	names: { name: string; language: NamedRef }[];
	pokemon_species: NamedRef[];
}

export async function getGenerations(): Promise<GenerationDetail[]> {
	const list = await fetchList('generation');
	const generations = await Promise.all(list.map((g) => fetchApi<GenerationDetail>(g.url)));
	return generations.filter((g): g is GenerationDetail => g !== null).sort((a, b) => a.id - b.id);
}

// ---------------------------------------------------------------------------------------
// Version groups

export async function getVersionGroupOrders(): Promise<Map<string, number>> {
	const list = await fetchList('version-group');
	const groups = await Promise.all(
		list.map((g) => fetchApi<{ name: string; order: number }>(g.url))
	);
	return new Map(groups.filter((g) => g !== null).map((g) => [g.name, g.order]));
}
