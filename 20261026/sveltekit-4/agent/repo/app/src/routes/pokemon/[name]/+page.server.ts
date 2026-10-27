import { error } from '@sveltejs/kit';
import {
	englishEntry,
	englishName,
	get,
	getOrThrow,
	getTypes,
	idFromUrl,
	latestFlavorText,
	typeRef
} from '#lib/server/api.ts';
import { humanize, type TypeRef } from '#lib/util.ts';
import type { PageServerLoad } from './$types';

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

export interface EvolutionNode {
	name: string;
	label: string;
	children: EvolutionNode[];
}

export interface MoveRow {
	level: number | null;
	name: string;
	label: string;
	type: TypeRef | null;
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

function evolutionTree(node: any): EvolutionNode {
	return {
		name: node.species.name,
		label: humanize(node.species.name),
		children: (node.evolves_to ?? []).map(evolutionTree)
	};
}

function methodRank(method: string): number {
	const i = METHOD_ORDER.indexOf(method);
	return i === -1 ? METHOD_ORDER.length : i;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const species = await get(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
	if (!species) error(404, 'Not found');

	const variety =
		species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
	const [pokemon, chain, typeIndex] = await Promise.all([
		variety ? get(variety.pokemon.url) : get(`pokemon/${species.id}`),
		species.evolution_chain ? get(species.evolution_chain.url) : null,
		getTypes()
	]);
	if (!pokemon) error(404, 'Not found');

	const name = englishName(species);
	const sprites = pokemon.sprites ?? {};
	const artwork =
		sprites.other?.['official-artwork']?.front_default ??
		sprites.other?.home?.front_default ??
		sprites.front_default ??
		null;

	const types = [...(pokemon.types ?? [])]
		.sort((a: any, b: any) => a.slot - b.slot)
		.map((t: any) => typeRef(typeIndex, t.type.name));

	const stats: { name: string; label: string; value: number }[] = (pokemon.stats ?? []).map((s: any) => ({
		name: s.stat.name,
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat as number
	}));

	const abilities = [...(pokemon.abilities ?? [])]
		.sort((a: any, b: any) => a.slot - b.slot)
		.map((a: any) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden }));

	const evolution = chain?.chain
		? evolutionTree(chain.chain)
		: { name: species.name, label: humanize(species.name), children: [] };

	// Moves: version groups in which the Pokémon learns anything, ordered by `order`.
	const details: { move: string; method: string; level: number; group: string }[] = [];
	const groupUrls = new Map<string, string>();
	for (const m of pokemon.moves ?? []) {
		for (const d of m.version_group_details ?? []) {
			details.push({
				move: m.move.name,
				method: d.move_learn_method.name,
				level: d.level_learned_at,
				group: d.version_group.name
			});
			groupUrls.set(d.version_group.name, d.version_group.url);
		}
	}
	const groups = (
		await Promise.all(
			[...groupUrls].map(async ([groupName, groupUrl]) => {
				const group = await get(groupUrl);
				return { name: groupName, label: humanize(groupName), order: group?.order ?? idFromUrl(groupUrl) };
			})
		)
	).sort((a, b) => a.order - b.order);

	const requested = url.searchParams.get('game');
	const game = groups.find((g) => g.name === requested)?.name ?? groups[groups.length - 1]?.name ?? null;

	const selected = details.filter((d) => d.group === game);
	const moveNames = [...new Set(selected.map((d) => d.move))];
	const moveData = new Map(
		await Promise.all(moveNames.map(async (n) => [n, await getOrThrow(`move/${n}`)] as const))
	);

	const tables = new Map<string, MoveRow[]>();
	const seen = new Set<string>();
	for (const d of selected) {
		const isLevelUp = d.method === 'level-up';
		const key = `${d.method}|${d.move}|${isLevelUp ? d.level : ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const move = moveData.get(d.move);
		if (!tables.has(d.method)) tables.set(d.method, []);
		tables.get(d.method)!.push({
			level: isLevelUp ? d.level : null,
			name: d.move,
			label: move ? englishName(move) : humanize(d.move),
			type: move?.type ? typeRef(typeIndex, move.type.name) : null,
			category: move?.damage_class ? humanize(move.damage_class.name) : null,
			power: move?.power ?? null,
			accuracy: move?.accuracy ?? null,
			pp: move?.pp ?? null
		});
	}
	const moveTables: MoveTable[] = [...tables]
		.map(([method, rows]) => ({ method, label: humanize(method), rows }))
		.sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));

	return {
		id: species.id as number,
		name,
		genus: (englishEntry<any>(species.genera)?.genus as string | undefined) ?? null,
		types,
		artwork,
		height: pokemon.height as number,
		weight: pokemon.weight as number,
		flavorText: latestFlavorText(species.flavor_text_entries) ?? null,
		stats,
		abilities,
		evolution,
		games: groups.map(({ name, label }) => ({ name, label })),
		game,
		moveTables
	};
};
