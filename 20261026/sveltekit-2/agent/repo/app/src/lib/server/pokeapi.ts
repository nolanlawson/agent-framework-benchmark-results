import { API_BASE_URL } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { englishName, humanize, isExcludedType, lastEnglishFlavorText } from '#lib/format.ts';
import type { CardData } from '#lib/types.ts';

// The API is a live service, so responses are only cached briefly. Concurrent requests for
// the same resource share one fetch.
const TTL_MS = 60_000;
const cache = new Map<string, { expires: number; promise: Promise<unknown> }>();

export interface NamedRef {
	name: string;
	url: string;
}
interface Localized {
	language: NamedRef;
}
export interface Name extends Localized {
	name: string;
}
export interface FlavorText extends Localized {
	flavor_text: string;
}
interface List {
	count: number;
	results: NamedRef[];
}

/** Path below /api/v2/ for a resource URL from the API (absolute or root-relative). */
function apiPath(urlOrPath: string): string {
	const match = urlOrPath.match(/\/api\/v2\/(.*)$/);
	return (match ? match[1] : urlOrPath).replace(/^\/+/, '');
}

/** Fetches /api/v2/<path>; resolves to null for a 404. */
export function get<T>(urlOrPath: string): Promise<T | null> {
	const path = apiPath(urlOrPath);
	const now = Date.now();
	const hit = cache.get(path);
	if (hit && hit.expires > now) return hit.promise as Promise<T | null>;

	const promise = (async () => {
		const res = await fetch(`${API_BASE_URL}/api/v2/${path}`);
		if (res.status === 404) {
			await res.body?.cancel();
			return null;
		}
		if (!res.ok) throw new Error(`API request for ${path} failed with status ${res.status}`);
		return (await res.json()) as T;
	})();
	cache.set(path, { expires: now + TTL_MS, promise });
	promise.catch(() => cache.delete(path));
	return promise;
}

/** Like get(), but turns a missing resource into a 404 page. */
export async function getOrNotFound<T>(urlOrPath: string): Promise<T> {
	const data = await get<T>(urlOrPath);
	if (data === null) error(404, 'Not found');
	return data;
}

async function getRequired<T>(urlOrPath: string): Promise<T> {
	const data = await get<T>(urlOrPath);
	if (data === null) throw new Error(`API resource ${urlOrPath} is missing`);
	return data;
}

export function idFromUrl(url: string): number {
	return Number(url.match(/\/(\d+)\/?$/)?.[1]);
}

/** Alternate forms (Mega Evolutions and so on) have Pokémon IDs above 10000. */
export const isDefaultForm = (pokemonId: number) => pokemonId > 0 && pokemonId <= 10000;

export function spriteUrl(id: number): string {
	return `${API_BASE_URL}/media/sprites/pokemon/${id}.png`;
}

const fullList = (resource: string) => getRequired<List>(`${resource}/?limit=100000&offset=0`);

/** Species ID → species API name. */
export async function speciesNames(): Promise<Map<number, string>> {
	const list = await fullList('pokemon-species');
	return new Map(list.results.map((r) => [idFromUrl(r.url), r.name]));
}

export interface TypeData {
	id: number;
	name: string;
	names: Name[];
	damage_relations: Record<string, NamedRef[]>;
	pokemon: { slot: number; pokemon: NamedRef }[];
	moves: NamedRef[];
}

/** The 18 types, in API order, with full details. */
export async function allTypes(): Promise<TypeData[]> {
	const list = await fullList('type');
	return Promise.all(
		list.results.filter((r) => !isExcludedType(r.name)).map((r) => getRequired<TypeData>(r.url))
	);
}

/** Type API name → English name. */
export async function typeNames(): Promise<Map<string, string>> {
	const types = await allTypes();
	return new Map(types.map((t) => [t.name, englishName(t.names, t.name)]));
}

export interface GenerationData {
	id: number;
	name: string;
	names: Name[];
	pokemon_species: NamedRef[];
}

export async function allGenerations(): Promise<GenerationData[]> {
	const list = await fullList('generation');
	const generations = await Promise.all(list.results.map((r) => getRequired<GenerationData>(r.url)));
	return generations.sort((a, b) => a.id - b.id);
}

export interface IndexEntry {
	id: number;
	name: string;
	label: string;
	types: string[];
	generation: string | null;
}

/** Every species with its default Pokémon's types and its generation, by dex number. */
export async function speciesIndex(): Promise<IndexEntry[]> {
	const [names, types, generations] = await Promise.all([speciesNames(), allTypes(), allGenerations()]);

	const typesById = new Map<number, { slot: number; type: string }[]>();
	for (const type of types) {
		for (const { slot, pokemon } of type.pokemon) {
			const id = idFromUrl(pokemon.url);
			if (!isDefaultForm(id)) continue;
			let entry = typesById.get(id);
			if (!entry) typesById.set(id, (entry = []));
			entry.push({ slot, type: type.name });
		}
	}
	const generationById = new Map<number, string>();
	for (const generation of generations) {
		for (const species of generation.pokemon_species) {
			generationById.set(idFromUrl(species.url), generation.name);
		}
	}

	return [...names]
		.sort(([a], [b]) => a - b)
		.map(([id, name]) => ({
			id,
			name,
			label: humanize(name),
			types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
			generation: generationById.get(id) ?? null
		}));
}

/**
 * Cards for a list of Pokémon references (from type, move or ability data): alternate forms
 * are left out, and each card shows and links to the Pokémon's species. Sorted by dex number.
 */
export async function cardsFor<T extends { url: string }>(
	refs: T[],
	extra?: (ref: T) => Partial<CardData>
): Promise<CardData[]> {
	const names = await speciesNames();
	const seen = new Set<number>();
	const cards: CardData[] = [];
	for (const ref of refs) {
		const id = idFromUrl(ref.url);
		if (!isDefaultForm(id) || seen.has(id)) continue;
		seen.add(id);
		const name = names.get(id) ?? (ref as unknown as NamedRef).name ?? String(id);
		cards.push({ id, name, label: humanize(name), sprite: spriteUrl(id), ...extra?.(ref) });
	}
	return cards.sort((a, b) => a.id - b.id);
}

export interface EffectEntry extends Localized {
	effect: string;
	short_effect: string;
}

export function englishShortEffect(
	entries: EffectEntry[] | undefined,
	effectChance?: number | null
): string | null {
	const entry = entries?.find((e) => e.language.name === 'en');
	if (!entry?.short_effect) return null;
	const text = entry.short_effect.replace(/\$effect_chance/g, String(effectChance ?? ''));
	return text.replace(/\s+/g, ' ').trim();
}

export { lastEnglishFlavorText };
