// Loaders that turn PokeAPI records into the view models the pages render.
// Server-only: everything here is fetched from the API at request time.

import { apiBase, getByName, getJson, mustGetJson } from './api.js';
import {
	DASH,
	englishName,
	humanize,
	idFromUrl,
	latestFlavorText,
	type NamedEntry,
	spriteUrl,
} from './format.js';
import type { Card, SpeciesIndex, SpeciesIndexEntry, TypeRef } from './types.js';

// MARK: API record shapes (only the fields we use)

interface Ref {
	name: string;
	url: string;
}
interface List {
	count: number;
	results: Ref[];
}
interface Names {
	name: string;
	names: NamedEntry[];
}
interface FlavorText {
	flavor_text: string;
	language: { name: string };
}
interface EffectEntry {
	short_effect: string;
	language: { name: string };
}
interface TypeRecord extends Names {
	pokemon: { slot: number; pokemon: Ref }[];
	moves: Ref[];
	damage_relations: Record<string, Ref[]>;
}
interface GenerationRecord extends Names {
	pokemon_species: Ref[];
}
interface SpeciesRecord extends Names {
	id: number;
	genera: { genus: string; language: { name: string } }[];
	flavor_text_entries: FlavorText[];
	evolution_chain: { url: string } | null;
	varieties: { is_default: boolean; pokemon: Ref }[];
}
interface PokemonRecord {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: { slot: number; type: Ref }[];
	abilities: { slot: number; is_hidden: boolean; ability: Ref }[];
	stats: { base_stat: number; stat: Ref }[];
	sprites: { other?: { 'official-artwork'?: { front_default: string | null } } };
	moves: {
		move: Ref;
		version_group_details: {
			level_learned_at: number;
			move_learn_method: Ref;
			version_group: Ref;
		}[];
	}[];
}
interface MoveRecord extends Names {
	type: Ref;
	damage_class: Ref | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect_chance: number | null;
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorText[];
	learned_by_pokemon: Ref[];
}
interface AbilityRecord extends Names {
	effect_entries: EffectEntry[];
	flavor_text_entries: FlavorText[];
	pokemon: { is_hidden: boolean; slot: number; pokemon: Ref }[];
}
interface ChainLink {
	species: Ref;
	evolves_to: ChainLink[];
}
interface VersionGroupRecord {
	name: string;
	order: number;
}

// MARK: Shared lookups

const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);
/** Pokémon IDs above this are alternate forms. */
const MAX_DEFAULT_POKEMON_ID = 10_000;

const ALL = '?limit=100000';

/** Species ID → species API name. */
async function speciesNames(): Promise<Map<number, string>> {
	const list = await mustGetJson<List>(`pokemon-species/${ALL}`);
	return new Map(list.results.map((ref) => [idFromUrl(ref.url), ref.name]));
}

/** The 18 types, in API order. */
async function typeRecords(): Promise<TypeRecord[]> {
	const list = await mustGetJson<List>(`type/${ALL}`);
	const refs = list.results.filter((ref) => !EXCLUDED_TYPES.has(ref.name));
	return Promise.all(refs.map((ref) => mustGetJson<TypeRecord>(`type/${ref.name}/`)));
}

export async function getTypeRefs(): Promise<TypeRef[]> {
	return (await typeRecords()).map((type) => ({ name: type.name, label: englishName(type.names, type.name) }));
}

async function typeLabeler(): Promise<(name: string) => TypeRef> {
	const labels = new Map((await getTypeRefs()).map((type) => [type.name, type.label]));
	return (name) => ({ name, label: labels.get(name) ?? humanize(name) });
}

async function generationRecords(): Promise<GenerationRecord[]> {
	const list = await mustGetJson<List>(`generation/${ALL}`);
	return Promise.all(list.results.map((ref) => mustGetJson<GenerationRecord>(`generation/${ref.name}/`)));
}

function englishEffect(entries: EffectEntry[] | undefined, effectChance?: number | null): string | undefined {
	const text = entries?.find((entry) => entry.language.name === 'en')?.short_effect;
	if (!text) return undefined;
	return text.replaceAll('$effect_chance', effectChance === null || effectChance === undefined ? '' : String(effectChance));
}

/**
 * Cards for a list of Pokémon references: alternate forms dropped, each mapped to its
 * species, deduplicated and ordered by dex number.
 */
async function cardsFor(refs: { pokemon: Ref; note?: string | undefined }[]): Promise<Card[]> {
	const species = await speciesNames();
	const base = apiBase();
	const cards = new Map<number, Card>();
	for (const { pokemon, note } of refs) {
		const id = idFromUrl(pokemon.url);
		if (!(id <= MAX_DEFAULT_POKEMON_ID) || cards.has(id)) continue;
		const name = species.get(id) ?? pokemon.name;
		cards.set(id, { id, name, label: humanize(name), sprite: spriteUrl(base, id), ...(note ? { note } : {}) });
	}
	return [...cards.values()].sort((a, b) => a.id - b.id);
}

// MARK: Home

export async function getSpeciesIndex(): Promise<SpeciesIndex> {
	const [species, types, generations] = await Promise.all([speciesNames(), typeRecords(), generationRecords()]);

	const entries = new Map<number, SpeciesIndexEntry & { slots: [number, string][] }>();
	for (const [id, name] of species) {
		entries.set(id, { id, name, label: humanize(name), types: [], generation: '', slots: [] });
	}
	for (const type of types) {
		for (const { slot, pokemon } of type.pokemon) {
			entries.get(idFromUrl(pokemon.url))?.slots.push([slot, type.name]);
		}
	}
	for (const generation of generations) {
		for (const ref of generation.pokemon_species) {
			const entry = entries.get(idFromUrl(ref.url));
			if (entry) entry.generation = generation.name;
		}
	}

	return {
		spriteBase: `${apiBase()}/media/sprites/pokemon`,
		types: types.map((type) => ({ name: type.name, label: englishName(type.names, type.name) })),
		generations: generations.map((generation) => ({
			name: generation.name,
			label: englishName(generation.names, generation.name),
		})),
		species: [...entries.values()]
			.sort((a, b) => a.id - b.id)
			.map(({ slots, ...entry }) => ({
				...entry,
				types: slots.sort((a, b) => a[0] - b[0]).map(([, type]) => type),
			})),
	};
}

// MARK: Pokémon page

export interface EvolutionNode {
	name: string;
	label: string;
	evolvesTo: EvolutionNode[];
}

export interface MoveRow {
	level: number | null;
	name: string;
	label: string;
	type: TypeRef;
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

export interface MoveTable {
	method: string;
	label: string;
	rows: MoveRow[];
}

export interface PokemonPage {
	id: number;
	name: string;
	label: string;
	genus: string | undefined;
	types: TypeRef[];
	artwork: string | null;
	height: string;
	weight: string;
	flavorText: string | undefined;
	stats: { label: string; value: number }[];
	abilities: { name: string; label: string; hidden: boolean }[];
	evolution: EvolutionNode | null;
	games: { name: string; label: string }[];
	game: string | undefined;
	moveTables: MoveTable[];
}

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function toEvolutionNode(link: ChainLink): EvolutionNode {
	return {
		name: link.species.name,
		label: humanize(link.species.name),
		evolvesTo: link.evolves_to.map(toEvolutionNode),
	};
}

async function moveRows(
	entries: { move: string; method: string; level: number }[],
	typeRef: (name: string) => TypeRef,
): Promise<MoveTable[]> {
	const moves = new Map<string, MoveRecord>();
	await Promise.all(
		[...new Set(entries.map((entry) => entry.move))].map(async (name) => {
			const move = await getJson<MoveRecord>(`move/${name}/`);
			if (move) moves.set(name, move);
		}),
	);

	const tables = new Map<string, MoveRow[]>();
	const seen = new Set<string>();
	for (const { move: name, method, level } of entries) {
		const key = `${method}|${name}|${method === 'level-up' ? level : ''}`;
		const move = moves.get(name);
		if (seen.has(key) || !move) continue;
		seen.add(key);
		const rows = tables.get(method) ?? [];
		tables.set(method, rows);
		rows.push({
			level: method === 'level-up' ? level : null,
			name,
			label: englishName(move.names, name),
			type: typeRef(move.type.name),
			category: move.damage_class ? humanize(move.damage_class.name) : null,
			power: move.power,
			accuracy: move.accuracy,
			pp: move.pp,
		});
	}

	const rank = (method: string) => {
		const index = METHOD_ORDER.indexOf(method);
		return index === -1 ? METHOD_ORDER.length : index;
	};
	return [...tables.entries()]
		.map(([method, rows]) => ({
			method,
			label: humanize(method),
			rows: rows.sort(
				(a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label),
			),
		}))
		.sort((a, b) => rank(a.method) - rank(b.method) || a.label.localeCompare(b.label));
}

export async function getPokemonPage(name: string | undefined, game: string | null): Promise<PokemonPage | null> {
	const species = await getByName<SpeciesRecord>('pokemon-species', name);
	if (!species) return null;

	const variety = species.varieties.find((entry) => entry.is_default) ?? species.varieties[0];
	const pokemonId = variety ? idFromUrl(variety.pokemon.url) : species.id;
	const chainId = species.evolution_chain ? idFromUrl(species.evolution_chain.url) : null;

	const [pokemon, chain, typeRef] = await Promise.all([
		mustGetJson<PokemonRecord>(`pokemon/${pokemonId}/`),
		chainId === null ? null : getJson<{ chain: ChainLink }>(`evolution-chain/${chainId}/`),
		typeLabeler(),
	]);

	// Moves, grouped by version group.
	const byGame = new Map<string, { move: string; method: string; level: number }[]>();
	for (const { move, version_group_details } of pokemon.moves) {
		for (const detail of version_group_details) {
			const list = byGame.get(detail.version_group.name) ?? [];
			byGame.set(detail.version_group.name, list);
			list.push({ move: move.name, method: detail.move_learn_method.name, level: detail.level_learned_at });
		}
	}
	const versionGroups = await Promise.all(
		[...byGame.keys()].map(async (vg) => (await getJson<VersionGroupRecord>(`version-group/${vg}/`)) ?? { name: vg, order: Infinity }),
	);
	versionGroups.sort((a, b) => a.order - b.order);
	const selected = versionGroups.find((vg) => vg.name === game)?.name ?? versionGroups.at(-1)?.name;

	return {
		id: species.id,
		name: species.name,
		label: englishName(species.names, species.name),
		genus: species.genera.find((entry) => entry.language.name === 'en')?.genus,
		types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((entry) => typeRef(entry.type.name)),
		artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? null,
		height: `${(pokemon.height / 10).toFixed(1)} m`,
		weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
		flavorText: latestFlavorText(species.flavor_text_entries),
		stats: pokemon.stats.map((stat) => ({
			label: STAT_LABELS[stat.stat.name] ?? humanize(stat.stat.name),
			value: stat.base_stat,
		})),
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((entry) => ({ name: entry.ability.name, label: humanize(entry.ability.name), hidden: entry.is_hidden })),
		evolution: chain ? toEvolutionNode(chain.chain) : null,
		games: versionGroups.map((vg) => ({ name: vg.name, label: humanize(vg.name) })),
		game: selected,
		moveTables: selected ? await moveRows(byGame.get(selected) ?? [], typeRef) : [],
	};
}

// MARK: Move page

export interface MovePage {
	name: string;
	label: string;
	type: TypeRef;
	category: string;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
	effect: string;
	learnedBy: Card[];
}

export async function getMovePage(name: string | undefined): Promise<MovePage | null> {
	const move = await getByName<MoveRecord>('move', name);
	if (!move) return null;
	const [typeRef, learnedBy] = await Promise.all([
		typeLabeler(),
		cardsFor(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
	]);
	return {
		name: move.name,
		label: englishName(move.names, move.name),
		type: typeRef(move.type.name),
		category: move.damage_class ? humanize(move.damage_class.name) : DASH,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect: englishEffect(move.effect_entries, move.effect_chance) ?? latestFlavorText(move.flavor_text_entries) ?? DASH,
		learnedBy,
	};
}

// MARK: Ability page

export interface AbilityPage {
	name: string;
	label: string;
	effect: string;
	pokemon: Card[];
}

export async function getAbilityPage(name: string | undefined): Promise<AbilityPage | null> {
	const ability = await getByName<AbilityRecord>('ability', name);
	if (!ability) return null;
	return {
		name: ability.name,
		label: englishName(ability.names, ability.name),
		effect: englishEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries) ?? DASH,
		pokemon: await cardsFor(
			ability.pokemon.map((entry) => ({ pokemon: entry.pokemon, note: entry.is_hidden ? 'Hidden ability' : undefined })),
		),
	};
}

// MARK: Type pages

export const DAMAGE_RELATIONS = [
	['double_damage_to', 'Super effective against'],
	['half_damage_to', 'Not very effective against'],
	['no_damage_to', 'No effect against'],
	['double_damage_from', 'Weak to'],
	['half_damage_from', 'Resists'],
	['no_damage_from', 'Immune to'],
] as const;

export interface TypePage {
	name: string;
	label: string;
	relations: { label: string; types: TypeRef[] }[];
	pokemon: Card[];
	moves: { name: string; label: string }[];
}

export async function getTypePage(name: string | undefined): Promise<TypePage | null> {
	if (name && EXCLUDED_TYPES.has(name.toLowerCase())) return null;
	const type = await getByName<TypeRecord>('type', name);
	if (!type) return null;
	const [typeRef, pokemon] = await Promise.all([typeLabeler(), cardsFor(type.pokemon)]);
	return {
		name: type.name,
		label: englishName(type.names, type.name),
		relations: DAMAGE_RELATIONS.map(([key, label]) => ({
			label,
			types: (type.damage_relations[key] ?? []).map((ref) => typeRef(ref.name)),
		})),
		pokemon,
		moves: type.moves
			.map((move) => ({ name: move.name, label: humanize(move.name) }))
			.sort((a, b) => a.label.localeCompare(b.label)),
	};
}
