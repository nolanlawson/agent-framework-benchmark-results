// Server-side PokeAPI client. Every page reads the API over HTTP at request time;
// responses are kept in memory for a short while so a page that needs hundreds of
// records (a Pokémon's moves, the home page index) stays fast.

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONCURRENT_REQUESTS = 24;

export function apiBaseUrl(): string {
	return (process.env.API_BASE_URL || 'http://localhost:9000').replace(/\/+$/, '');
}

interface CacheEntry {
	expires: number;
	value: Promise<unknown>;
}

const cache = new Map<string, CacheEntry>();

// A small semaphore so a cold page doesn't open hundreds of sockets at once.
let active = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
	if (active >= MAX_CONCURRENT_REQUESTS) await new Promise<void>((resolve) => waiting.push(resolve));
	active++;
	try {
		return await task();
	} finally {
		active--;
		waiting.shift()?.();
	}
}

async function request(path: string): Promise<unknown> {
	const url = `${apiBaseUrl()}/api/v2/${path}`;
	return withSlot(async () => {
		const response = await fetch(url, { headers: { accept: 'application/json' } });
		if (response.status === 404) {
			await response.body?.cancel();
			return null;
		}
		if (!response.ok) throw new Error(`PokeAPI ${response.status} for ${url}`);
		return response.json();
	});
}

/**
 * Fetch `/api/v2/<path>`. Resolves to `null` when the API has no such resource.
 * `path` is relative to the API root, e.g. `pokemon/25` or `type/?limit=100`.
 */
export function api<T>(path: string): Promise<T | null> {
	const key = path.replace(/^\/+/, '');
	const now = Date.now();
	const hit = cache.get(key);
	if (hit && hit.expires > now) return hit.value as Promise<T | null>;
	const value = request(key);
	cache.set(key, { expires: now + CACHE_TTL_MS, value });
	// Don't keep failures around.
	value.catch(() => cache.delete(key));
	return value as Promise<T | null>;
}

/** Like `api`, but for resources that must exist. */
export async function apiRequired<T>(path: string): Promise<T> {
	const result = await api<T>(path);
	if (result === null) throw new Error(`PokeAPI resource missing: ${path}`);
	return result;
}

/** Fetch every entry of a list endpoint. */
export async function apiList(resource: string): Promise<NamedResource[]> {
	const list = await apiRequired<{ results: NamedResource[] }>(`${resource}/?limit=100000`);
	return list.results;
}

/** Path of an API URL relative to the API root (`.../api/v2/move/5/` → `move/5`). */
export function apiPath(url: string): string {
	return url.replace(/^.*\/api\/v2\//, '').replace(/\/+$/, '');
}

/** Numeric ID at the end of an API URL. */
export function idFromUrl(url: string): number {
	const match = url.match(/\/(\d+)\/?$/);
	return match ? Number(match[1]) : Number.NaN;
}

// MARK: Response shapes (only the fields the app uses)

export interface NamedResource {
	name: string;
	url: string;
}

export interface Name {
	name: string;
	language: NamedResource;
}

export interface FlavorText {
	flavor_text: string;
	language: NamedResource;
}

export interface EffectEntry {
	effect: string;
	short_effect: string;
	language: NamedResource;
}

export interface Species {
	id: number;
	name: string;
	names: Name[];
	genera: Array<{ genus: string; language: NamedResource }>;
	flavor_text_entries: FlavorText[];
	generation: NamedResource;
	evolution_chain: { url: string } | null;
	varieties: Array<{ is_default: boolean; pokemon: NamedResource }>;
}

export interface Pokemon {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: Array<{ slot: number; type: NamedResource }>;
	abilities: Array<{ slot: number; is_hidden: boolean; ability: NamedResource }>;
	stats: Array<{ base_stat: number; stat: NamedResource }>;
	moves: Array<{
		move: NamedResource;
		version_group_details: Array<{
			level_learned_at: number;
			version_group: NamedResource;
			move_learn_method: NamedResource;
		}>;
	}>;
	sprites: {
		front_default: string | null;
		other?: Record<string, { front_default?: string | null } | undefined>;
	};
}

export interface ChainLink {
	species: NamedResource;
	evolves_to: ChainLink[];
}

export interface EvolutionChain {
	id: number;
	chain: ChainLink;
}

export interface Move {
	id: number;
	name: string;
	names: Name[];
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_chance: number | null;
	damage_class: NamedResource | null;
	type: NamedResource;
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorText[];
	learned_by_pokemon: NamedResource[];
}

export interface Ability {
	id: number;
	name: string;
	names: Name[];
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorText[];
	pokemon: Array<{ is_hidden: boolean; slot: number; pokemon: NamedResource }>;
}

export interface Type {
	id: number;
	name: string;
	names: Name[];
	damage_relations: Record<
		| 'double_damage_to'
		| 'half_damage_to'
		| 'no_damage_to'
		| 'double_damage_from'
		| 'half_damage_from'
		| 'no_damage_from',
		NamedResource[]
	>;
	pokemon: Array<{ slot: number; pokemon: NamedResource }>;
	moves: NamedResource[];
}

export interface Generation {
	id: number;
	name: string;
	names: Name[];
	pokemon_species: NamedResource[];
}

export interface VersionGroup {
	id: number;
	name: string;
	order: number;
}

/**
 * True while `vite build` renders route documents to collect their assets.
 * The API must only be read at request time, so handlers return empty data then.
 */
export function isBuilding(): boolean {
	return process.env.POKEDEX_BUILDING === '1';
}
