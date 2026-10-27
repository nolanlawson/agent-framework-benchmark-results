// Domain-level data access: each function fetches what a page needs from the API and
// caches a trimmed view of it.

import { cached, fetchJson, mediaUrl } from './api.ts';
import { englishName, humanize, idFromUrl, latestFlavorText } from '../format.ts';
import type { PokemonCard, TypeTag } from '../types.ts';

// --- Raw API shapes (only the fields we use) -------------------------------------------

interface ApiRef {
	name: string;
	url: string;
}

interface ApiName {
	name: string;
	language: ApiRef;
}

interface ApiFlavorText {
	flavor_text: string;
	language: ApiRef;
}

interface ApiEffect {
	short_effect: string;
	language: ApiRef;
}

interface ApiList {
	count: number;
	results: ApiRef[];
}

interface ApiType {
	id: number;
	name: string;
	names: ApiName[];
	damage_relations: Record<string, ApiRef[]>;
	pokemon: { slot: number; pokemon: ApiRef }[];
	moves: ApiRef[];
}

interface ApiGeneration {
	id: number;
	name: string;
	names: ApiName[];
	pokemon_species: ApiRef[];
}

interface ApiSpecies {
	id: number;
	name: string;
	names: ApiName[];
	genera: { genus: string; language: ApiRef }[];
	flavor_text_entries: ApiFlavorText[];
	evolution_chain: { url: string } | null;
	varieties: { is_default: boolean; pokemon: ApiRef }[];
}

interface ApiPokemon {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: { slot: number; type: ApiRef }[];
	abilities: { slot: number; is_hidden: boolean; ability: ApiRef }[];
	stats: { base_stat: number; stat: ApiRef }[];
	sprites: { other?: { 'official-artwork'?: { front_default: string | null } } };
	moves: {
		move: ApiRef;
		version_group_details: {
			level_learned_at: number;
			version_group: ApiRef;
			move_learn_method: ApiRef;
		}[];
	}[];
}

interface ApiChainLink {
	species: ApiRef;
	evolves_to: ApiChainLink[];
}

interface ApiMove {
	id: number;
	name: string;
	names: ApiName[];
	type: ApiRef;
	damage_class: ApiRef | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_entries: ApiEffect[];
	flavor_text_entries: ApiFlavorText[];
	learned_by_pokemon: ApiRef[];
}

interface ApiAbility {
	id: number;
	name: string;
	names: ApiName[];
	effect_entries: ApiEffect[];
	flavor_text_entries: ApiFlavorText[];
	pokemon: { is_hidden: boolean; pokemon: ApiRef }[];
}

interface ApiVersionGroup {
	name: string;
	order: number;
}

// --- Helpers ---------------------------------------------------------------------------

/** Pokémon IDs above this are alternate forms, which the app leaves out. */
const MAX_DEFAULT_FORM_ID = 10000;

/** Types that exist in the API but aren't among the 18 the app lists. */
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

const ALL = '?limit=100000';

function englishShortEffect(entries: ApiEffect[]): string | null {
	return entries.find((e) => e.language.name === 'en')?.short_effect.replace(/\s+/g, ' ').trim() || null;
}

export function spriteUrl(id: number): string {
	return mediaUrl(`sprites/pokemon/${id}.png`);
}

// --- Lists -----------------------------------------------------------------------------

export interface SpeciesSummary {
	id: number;
	name: string;
}

/** Every species the API lists, ordered by dex number. */
export function getSpeciesList(): Promise<SpeciesSummary[]> {
	return cached('list:pokemon-species', async () => {
		const list = await fetchJson<ApiList>(`pokemon-species/${ALL}`);
		return (list?.results ?? [])
			.map((r) => ({ id: idFromUrl(r.url), name: r.name }))
			.filter((s) => Number.isFinite(s.id))
			.sort((a, b) => a.id - b.id);
	});
}

async function getSpeciesById(): Promise<Map<number, SpeciesSummary>> {
	return new Map((await getSpeciesList()).map((s) => [s.id, s]));
}

// --- Types -----------------------------------------------------------------------------

export interface TypeInfo {
	id: number;
	name: string;
	label: string;
	damageRelations: Record<string, string[]>;
	/** Pokémon of this type (default forms only) with their slot */
	pokemon: { id: number; slot: number }[];
	moves: string[];
}

export function getType(name: string): Promise<TypeInfo | null> {
	return cached(`type:${name}`, async () => {
		const type = await fetchJson<ApiType>(`type/${encodeURIComponent(name)}`);
		if (!type) return null;
		return {
			id: type.id,
			name: type.name,
			label: englishName(type.names, type.name),
			damageRelations: Object.fromEntries(
				Object.entries(type.damage_relations).map(([k, refs]) => [k, refs.map((r) => r.name)])
			),
			pokemon: type.pokemon
				.map((p) => ({ id: idFromUrl(p.pokemon.url), slot: p.slot }))
				.filter((p) => p.id <= MAX_DEFAULT_FORM_ID),
			moves: type.moves.map((m) => m.name)
		};
	});
}

function getTypeNames(): Promise<string[]> {
	return cached('list:type', async () => {
		const list = await fetchJson<ApiList>(`type/${ALL}`);
		return (list?.results ?? []).map((r) => r.name);
	});
}

/** The 18 types, in API order. */
export async function getMainTypes(): Promise<TypeInfo[]> {
	const names = (await getTypeNames()).filter((n) => !EXCLUDED_TYPES.has(n));
	const types = await Promise.all(names.map(getType));
	return types.filter((t): t is TypeInfo => t !== null);
}

/** API name → English name for every type the API has. */
export async function getTypeLabels(): Promise<Map<string, string>> {
	const types = await Promise.all((await getTypeNames()).map(getType));
	return new Map(types.filter((t) => t !== null).map((t) => [t.name, t.label]));
}

export function typeTag(name: string, labels: Map<string, string>): TypeTag {
	return { name, label: labels.get(name) ?? humanize(name) };
}

// --- Generations -----------------------------------------------------------------------

export interface GenerationInfo {
	name: string;
	label: string;
	speciesIds: number[];
}

export function getGenerations(): Promise<GenerationInfo[]> {
	return cached('generations', async () => {
		const list = await fetchJson<ApiList>(`generation/${ALL}`);
		const gens = await Promise.all(
			(list?.results ?? []).map((r) => fetchJson<ApiGeneration>(r.url))
		);
		return gens
			.filter((g): g is ApiGeneration => g !== null)
			.sort((a, b) => a.id - b.id)
			.map((g) => ({
				name: g.name,
				label: englishName(g.names, g.name),
				speciesIds: g.pokemon_species.map((s) => idFromUrl(s.url))
			}));
	});
}

// --- Pokémon index (home page) ---------------------------------------------------------

export interface IndexEntry extends SpeciesSummary {
	label: string;
	types: string[];
	generation: string | null;
}

/** Every species with its default Pokémon's types and its generation. */
export async function getPokemonIndex(): Promise<IndexEntry[]> {
	const [species, types, generations] = await Promise.all([
		getSpeciesList(),
		getMainTypes(),
		getGenerations()
	]);

	const typesById = new Map<number, { slot: number; name: string }[]>();
	for (const type of types) {
		for (const { id, slot } of type.pokemon) {
			let list = typesById.get(id);
			if (!list) typesById.set(id, (list = []));
			list.push({ slot, name: type.name });
		}
	}
	const generationById = new Map<number, string>();
	for (const gen of generations) {
		for (const id of gen.speciesIds) generationById.set(id, gen.name);
	}

	return species.map((s) => ({
		...s,
		label: humanize(s.name),
		types: (typesById.get(s.id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.name),
		generation: generationById.get(s.id) ?? null
	}));
}

// --- Cards -----------------------------------------------------------------------------

/**
 * Turns references to Pokémon (by ID) into species cards: alternate forms are dropped,
 * duplicates removed, and the result is ordered by dex number.
 */
export async function cardsFor<T extends { id: number }>(
	pokemon: T[],
	extra?: (p: T) => Partial<PokemonCard>
): Promise<PokemonCard[]> {
	const species = await getSpeciesById();
	const seen = new Set<number>();
	const cards: PokemonCard[] = [];
	for (const p of pokemon) {
		if (p.id > MAX_DEFAULT_FORM_ID || seen.has(p.id)) continue;
		const s = species.get(p.id);
		if (!s) continue;
		seen.add(p.id);
		cards.push({ id: s.id, name: s.name, label: humanize(s.name), sprite: spriteUrl(s.id), ...extra?.(p) });
	}
	return cards.sort((a, b) => a.id - b.id);
}

// --- Species & Pokémon -----------------------------------------------------------------

export interface SpeciesInfo {
	id: number;
	name: string;
	label: string;
	genus: string | null;
	flavorText: string | null;
	evolutionChainUrl: string | null;
	defaultPokemonUrl: string | null;
}

export function getSpecies(name: string): Promise<SpeciesInfo | null> {
	return cached(`species:${name}`, async () => {
		const s = await fetchJson<ApiSpecies>(`pokemon-species/${encodeURIComponent(name)}`);
		if (!s) return null;
		const defaultVariety = s.varieties.find((v) => v.is_default) ?? s.varieties[0];
		return {
			id: s.id,
			name: s.name,
			label: englishName(s.names, s.name),
			genus: s.genera.find((g) => g.language.name === 'en')?.genus ?? null,
			flavorText: latestFlavorText(s.flavor_text_entries),
			evolutionChainUrl: s.evolution_chain?.url ?? null,
			defaultPokemonUrl: defaultVariety?.pokemon.url ?? null
		};
	});
}

export interface LearnedMove {
	move: string;
	versionGroup: string;
	method: string;
	level: number;
}

export interface PokemonInfo {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: string[];
	abilities: { name: string; hidden: boolean }[];
	stats: { name: string; value: number }[];
	artwork: string | null;
	moves: LearnedMove[];
}

export function getPokemon(pathOrUrl: string): Promise<PokemonInfo | null> {
	return cached(`pokemon:${pathOrUrl}`, async () => {
		const p = await fetchJson<ApiPokemon>(pathOrUrl);
		if (!p) return null;
		return {
			id: p.id,
			name: p.name,
			height: p.height,
			weight: p.weight,
			types: [...p.types].sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
			abilities: [...p.abilities]
				.sort((a, b) => a.slot - b.slot)
				.map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
			stats: p.stats.map((s) => ({ name: s.stat.name, value: s.base_stat })),
			artwork: p.sprites.other?.['official-artwork']?.front_default ?? null,
			moves: p.moves.flatMap((m) =>
				m.version_group_details.map((d) => ({
					move: m.move.name,
					versionGroup: d.version_group.name,
					method: d.move_learn_method.name,
					level: d.level_learned_at
				}))
			)
		};
	});
}

export interface ChainNode {
	name: string;
	evolvesTo: ChainNode[];
}

export function getEvolutionChain(url: string): Promise<ChainNode | null> {
	return cached(`evolution-chain:${url}`, async () => {
		const chain = await fetchJson<{ chain: ApiChainLink }>(url);
		if (!chain) return null;
		const walk = (link: ApiChainLink): ChainNode => ({
			name: link.species.name,
			evolvesTo: link.evolves_to.map(walk)
		});
		return walk(chain.chain);
	});
}

/** Version group name → `order`. */
export function getVersionGroupOrders(): Promise<Map<string, number>> {
	return cached('version-groups', async () => {
		const list = await fetchJson<ApiList>(`version-group/${ALL}`);
		const groups = await Promise.all(
			(list?.results ?? []).map((r) => fetchJson<ApiVersionGroup>(r.url))
		);
		return new Map(groups.filter((g) => g !== null).map((g) => [g.name, g.order]));
	});
}

// --- Moves -----------------------------------------------------------------------------

export interface MoveInfo {
	id: number;
	name: string;
	label: string;
	type: string;
	damageClass: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect: string | null;
	learnedBy: number[];
}

export function getMove(name: string): Promise<MoveInfo | null> {
	return cached(`move:${name}`, async () => {
		const m = await fetchJson<ApiMove>(`move/${encodeURIComponent(name)}`);
		if (!m) return null;
		return {
			id: m.id,
			name: m.name,
			label: englishName(m.names, m.name),
			type: m.type.name,
			damageClass: m.damage_class?.name ?? null,
			power: m.power,
			accuracy: m.accuracy,
			pp: m.pp,
			effect: englishShortEffect(m.effect_entries) ?? latestFlavorText(m.flavor_text_entries),
			learnedBy: m.learned_by_pokemon.map((p) => idFromUrl(p.url))
		};
	});
}

// --- Abilities -------------------------------------------------------------------------

export interface AbilityInfo {
	id: number;
	name: string;
	label: string;
	effect: string | null;
	pokemon: { id: number; hidden: boolean }[];
}

export function getAbility(name: string): Promise<AbilityInfo | null> {
	return cached(`ability:${name}`, async () => {
		const a = await fetchJson<ApiAbility>(`ability/${encodeURIComponent(name)}`);
		if (!a) return null;
		return {
			id: a.id,
			name: a.name,
			label: englishName(a.names, a.name),
			effect: englishShortEffect(a.effect_entries) ?? latestFlavorText(a.flavor_text_entries),
			pokemon: a.pokemon.map((p) => ({ id: idFromUrl(p.pokemon.url), hidden: p.is_hidden }))
		};
	});
}
