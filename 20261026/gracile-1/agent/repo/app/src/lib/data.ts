// Server-side view models built from PokeAPI responses.

import {
	api,
	apiBaseUrl,
	apiList,
	apiPath,
	apiRequired,
	idFromUrl,
	type Ability,
	type ChainLink,
	type EffectEntry,
	type EvolutionChain,
	type FlavorText,
	type Generation,
	type Move,
	type Name,
	type NamedResource,
	type Pokemon,
	type Species,
	type Type,
	type VersionGroup,
} from './api.js';
import {
	PAGE_SIZE,
	humanize,
	type BrowseOptions,
	type BrowseResult,
	type BrowseState,
	type CardItem,
	type TypeRef,
} from './format.js';
import type { MoveInfo, MovesData } from '../components/pokemon-moves.js';

/** Alternate forms (Mega Evolutions etc.) have Pokémon IDs above this. */
const MAX_DEFAULT_POKEMON_ID = 10000;
const EXCLUDED_TYPES = new Set(['stellar', 'unknown', 'shadow']);

// MARK: Text helpers

export function englishName(names: Name[], fallback: string): string {
	return names.find((n) => n.language.name === 'en')?.name ?? humanize(fallback);
}

export function latestFlavorText(entries: FlavorText[]): string | null {
	const english = entries.filter((e) => e.language.name === 'en');
	const last = english.at(-1);
	return last ? last.flavor_text.replace(/\s+/g, ' ').trim() : null;
}

function englishShortEffect(entries: EffectEntry[], effectChance?: number | null): string | null {
	const entry = entries.find((e) => e.language.name === 'en');
	if (!entry?.short_effect) return null;
	const text = entry.short_effect.replace(/\s+/g, ' ').trim();
	return effectChance == null ? text : text.replaceAll('$effect_chance', String(effectChance));
}

export function spriteUrl(id: number): string {
	return `${apiBaseUrl()}/media/sprites/pokemon/${id}.png`;
}

// MARK: Types and generations

/** The 18 types, in API order. */
export async function allTypes(): Promise<Type[]> {
	const list = await apiList('type');
	const wanted = list.filter((t) => !EXCLUDED_TYPES.has(t.name));
	return Promise.all(wanted.map((t) => apiRequired<Type>(apiPath(t.url))));
}

export async function typeRefs(): Promise<TypeRef[]> {
	return (await allTypes()).map((t) => ({ name: t.name, label: englishName(t.names, t.name) }));
}

/** Type name → English name, for every type the API knows. */
async function typeLabels(): Promise<Map<string, string>> {
	return new Map((await typeRefs()).map((t) => [t.name, t.label]));
}

function typeRef(labels: Map<string, string>, name: string): TypeRef {
	return { name, label: labels.get(name) ?? humanize(name) };
}

async function allGenerations(): Promise<Generation[]> {
	const list = await apiList('generation');
	const generations = await Promise.all(list.map((g) => apiRequired<Generation>(apiPath(g.url))));
	return generations.sort((a, b) => a.id - b.id);
}

// MARK: Species index

export interface SpeciesEntry {
	id: number;
	name: string;
	label: string;
	types: TypeRef[];
	generation: string;
}

export interface SpeciesIndex {
	list: SpeciesEntry[];
	byId: Map<number, SpeciesEntry>;
}

/** Every species with its default Pokémon's types and its generation. */
export async function speciesIndex(): Promise<SpeciesIndex> {
	const [speciesList, types, generations] = await Promise.all([
		apiList('pokemon-species'),
		allTypes(),
		allGenerations(),
	]);

	const typesById = new Map<number, Array<{ slot: number; type: TypeRef }>>();
	for (const type of types) {
		const ref = { name: type.name, label: englishName(type.names, type.name) };
		for (const { slot, pokemon } of type.pokemon) {
			const id = idFromUrl(pokemon.url);
			if (!(id <= MAX_DEFAULT_POKEMON_ID)) continue;
			let entry = typesById.get(id);
			if (!entry) typesById.set(id, (entry = []));
			entry.push({ slot, type: ref });
		}
	}

	const generationById = new Map<number, string>();
	for (const generation of generations)
		for (const species of generation.pokemon_species) generationById.set(idFromUrl(species.url), generation.name);

	const list = speciesList
		.map((species): SpeciesEntry => {
			const id = idFromUrl(species.url);
			return {
				id,
				name: species.name,
				label: humanize(species.name),
				types: (typesById.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((t) => t.type),
				generation: generationById.get(id) ?? '',
			};
		})
		.sort((a, b) => a.id - b.id);

	return { list, byId: new Map(list.map((s) => [s.id, s])) };
}

function card(entry: SpeciesEntry, withTypes = false): CardItem {
	const item: CardItem = { id: entry.id, name: entry.name, label: entry.label, sprite: spriteUrl(entry.id) };
	if (withTypes) item.types = entry.types;
	return item;
}

/**
 * Cards for a list of Pokémon references (from types, moves and abilities):
 * alternate forms are left out and each Pokémon is shown as its species.
 */
async function cardsFor(refs: Array<{ pokemon: NamedResource; hidden?: boolean }>): Promise<CardItem[]> {
	const index = await speciesIndex();
	const cards = new Map<number, CardItem>();
	for (const { pokemon, hidden } of refs) {
		const id = idFromUrl(pokemon.url);
		if (!(id <= MAX_DEFAULT_POKEMON_ID) || cards.has(id)) continue;
		const species = index.byId.get(id);
		const item = species
			? card(species)
			: { id, name: pokemon.name, label: humanize(pokemon.name), sprite: spriteUrl(id) };
		if (hidden) item.hidden = true;
		cards.set(id, item);
	}
	return [...cards.values()].sort((a, b) => a.id - b.id);
}

// MARK: Home

export async function browseOptions(): Promise<BrowseOptions> {
	const [types, generations] = await Promise.all([typeRefs(), allGenerations()]);
	return {
		types,
		generations: generations.map((g) => ({ name: g.name, label: englishName(g.names, g.name) })),
	};
}

export async function browse(state: BrowseState): Promise<BrowseResult> {
	const index = await speciesIndex();
	const query = state.q.trim().toLowerCase();
	const matches = index.list.filter(
		(s) =>
			(!query || s.label.toLowerCase().includes(query)) &&
			(!state.type || s.types.some((t) => t.name === state.type)) &&
			(!state.generation || s.generation === state.generation),
	);
	const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
	const page = Math.min(Math.max(1, state.page), totalPages);
	return {
		count: matches.length,
		page,
		totalPages,
		items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((s) => card(s, true)),
	};
}

// MARK: Pokémon

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};

export interface EvolutionNode {
	name: string;
	label: string;
	children: EvolutionNode[];
}

function evolutionTree(link: ChainLink): EvolutionNode {
	return {
		name: link.species.name,
		label: humanize(link.species.name),
		children: link.evolves_to.map(evolutionTree),
	};
}

export async function pokemonPage(name: string) {
	const species = await api<Species>(`pokemon-species/${encodeURIComponent(name.toLowerCase())}`);
	if (!species) return null;

	const variety = species.varieties.find((v) => v.is_default);
	const [pokemon, chain, labels] = await Promise.all([
		apiRequired<Pokemon>(variety ? apiPath(variety.pokemon.url) : `pokemon/${species.id}`),
		species.evolution_chain ? api<EvolutionChain>(apiPath(species.evolution_chain.url)) : null,
		typeLabels(),
	]);

	const label = englishName(species.names, species.name);
	const stats = pokemon.stats.map((s) => ({
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat,
	}));

	return {
		id: species.id,
		name: species.name,
		label,
		genus: species.genera.find((g) => g.language.name === 'en')?.genus ?? null,
		flavorText: latestFlavorText(species.flavor_text_entries),
		types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(labels, t.type.name)),
		artwork:
			pokemon.sprites.other?.['official-artwork']?.front_default ??
			pokemon.sprites.front_default ??
			spriteUrl(pokemon.id),
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		stats,
		total: stats.reduce((sum, s) => sum + s.value, 0),
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
		evolution: chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
		moves: await movesData(pokemon, labels),
	};
}

async function movesData(pokemon: Pokemon, labels: Map<string, string>): Promise<MovesData> {
	const moveRefs = new Map<string, string>();
	const groupNames = new Set<string>();
	for (const { move, version_group_details } of pokemon.moves) {
		moveRefs.set(move.name, move.url);
		for (const detail of version_group_details) groupNames.add(detail.version_group.name);
	}

	const [moves, groups] = await Promise.all([
		Promise.all([...moveRefs.values()].map((url) => apiRequired<Move>(apiPath(url)))),
		Promise.all([...groupNames].map((name) => apiRequired<VersionGroup>(`version-group/${name}`))),
	]);

	const moveInfo: Record<string, MoveInfo> = {};
	for (const move of moves) {
		moveInfo[move.name] = {
			label: englishName(move.names, move.name),
			type: typeRef(labels, move.type.name),
			category: move.damage_class ? humanize(move.damage_class.name) : null,
			power: move.power,
			accuracy: move.accuracy,
			pp: move.pp,
		};
	}

	const learn: MovesData['learn'] = {};
	for (const { move, version_group_details } of pokemon.moves)
		for (const detail of version_group_details)
			(learn[detail.version_group.name] ??= []).push([
				move.name,
				detail.move_learn_method.name,
				detail.level_learned_at,
			]);

	return {
		versionGroups: groups
			.sort((a, b) => a.order - b.order)
			.map((g) => ({ name: g.name, label: humanize(g.name) })),
		moves: moveInfo,
		learn,
	};
}

// MARK: Moves, abilities, types

export async function movePage(name: string) {
	const move = await api<Move>(`move/${encodeURIComponent(name.toLowerCase())}`);
	if (!move) return null;
	const labels = await typeLabels();
	return {
		label: englishName(move.names, move.name),
		type: typeRef(labels, move.type.name),
		category: move.damage_class ? humanize(move.damage_class.name) : null,
		power: move.power,
		accuracy: move.accuracy,
		pp: move.pp,
		effect:
			englishShortEffect(move.effect_entries, move.effect_chance) ?? latestFlavorText(move.flavor_text_entries),
		learnedBy: await cardsFor(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
	};
}

export async function abilityPage(name: string) {
	const ability = await api<Ability>(`ability/${encodeURIComponent(name.toLowerCase())}`);
	if (!ability) return null;
	return {
		label: englishName(ability.names, ability.name),
		effect: englishShortEffect(ability.effect_entries) ?? latestFlavorText(ability.flavor_text_entries),
		pokemon: await cardsFor(ability.pokemon.map((p) => ({ pokemon: p.pokemon, hidden: p.is_hidden }))),
	};
}

export const DAMAGE_RELATIONS = [
	['double_damage_to', 'Super effective against'],
	['half_damage_to', 'Not very effective against'],
	['no_damage_to', 'No effect against'],
	['double_damage_from', 'Weak to'],
	['half_damage_from', 'Resists'],
	['no_damage_from', 'Immune to'],
] as const;

export async function typePage(name: string) {
	const key = name.toLowerCase();
	if (EXCLUDED_TYPES.has(key)) return null;
	const type = await api<Type>(`type/${encodeURIComponent(key)}`);
	if (!type || EXCLUDED_TYPES.has(type.name)) return null;
	const labels = await typeLabels();
	return {
		label: englishName(type.names, type.name),
		relations: DAMAGE_RELATIONS.map(([key, label]) => ({
			label,
			types: type.damage_relations[key].map((t) => typeRef(labels, t.name)),
		})),
		pokemon: await cardsFor(type.pokemon.map((p) => ({ pokemon: p.pokemon }))),
		moves: type.moves
			.map((m) => ({ name: m.name, label: humanize(m.name) }))
			.sort((a, b) => a.label.localeCompare(b.label)),
	};
}
