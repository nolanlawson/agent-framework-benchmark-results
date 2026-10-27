import { redirect } from '@sveltejs/kit';
import {
	get,
	getOrNotFound,
	lastEnglishFlavorText,
	typeNames,
	type FlavorText,
	type Name,
	type NamedRef
} from '#lib/server/pokeapi.ts';
import { englishName, humanize } from '#lib/format.ts';
import type { EvolutionNode } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

interface Species {
	id: number;
	name: string;
	names: Name[];
	genera: { genus: string; language: NamedRef }[];
	flavor_text_entries: FlavorText[];
	evolution_chain: { url: string } | null;
	varieties: { is_default: boolean; pokemon: NamedRef }[];
}

interface Pokemon {
	id: number;
	height: number;
	weight: number;
	types: { slot: number; type: NamedRef }[];
	abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[];
	stats: { base_stat: number; stat: NamedRef }[];
	sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
	moves: {
		move: NamedRef;
		version_group_details: { level_learned_at: number; version_group: NamedRef; move_learn_method: NamedRef }[];
	}[];
}

interface ChainLink {
	species: NamedRef;
	evolves_to: ChainLink[];
}

interface Move {
	name: string;
	names: Name[];
	type: NamedRef;
	damage_class: NamedRef | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

export interface MoveRow {
	level: number | null;
	name: string;
	label: string;
	type: string;
	typeLabel: string;
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function toTree(link: ChainLink): EvolutionNode {
	return {
		name: link.species.name,
		label: humanize(link.species.name),
		children: link.evolves_to.map(toTree)
	};
}

export const load: PageServerLoad = async ({ params, url }) => {
	const species = await getOrNotFound<Species>(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
	// Pages live at the species' API name; send IDs and other spellings there.
	if (species.name !== params.name) redirect(308, `/pokemon/${species.name}${url.search}`);

	const variety = species.varieties.find((v) => v.is_default)?.pokemon;
	const [pokemon, chain, types] = await Promise.all([
		getOrNotFound<Pokemon>(variety ? variety.url : `pokemon/${species.id}`),
		species.evolution_chain ? get<{ chain: ChainLink }>(species.evolution_chain.url) : null,
		typeNames()
	]);
	const typeLabel = (name: string) => types.get(name) ?? humanize(name);

	// Version groups in which this Pokémon learns moves, by their order.
	const groupNames = [
		...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name)))
	];
	const groups = await Promise.all(
		groupNames.map(async (name) => {
			const group = await get<{ order: number }>(`version-group/${name}`);
			return { name, label: humanize(name), order: group?.order ?? Number.MAX_SAFE_INTEGER };
		})
	);
	groups.sort((a, b) => a.order - b.order);

	const requestedGame = url.searchParams.get('game');
	const game = groups.find((g) => g.name === requestedGame)?.name ?? groups.at(-1)?.name ?? null;

	// Moves learned in the selected version group, grouped by learn method.
	const learned = pokemon.moves.flatMap((m) =>
		m.version_group_details
			.filter((d) => d.version_group.name === game)
			.map((d) => ({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at }))
	);
	const moveDetails = new Map(
		await Promise.all(
			[...new Set(learned.map((l) => l.move.url))].map(async (moveUrl) => [moveUrl, await get<Move>(moveUrl)] as const)
		)
	);

	const byMethod = new Map<string, MoveRow[]>();
	const seen = new Set<string>();
	for (const { move, method, level } of learned) {
		const key = `${method}|${move.name}|${method === 'level-up' ? level : ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const detail = moveDetails.get(move.url);
		const row: MoveRow = {
			level: method === 'level-up' ? level : null,
			name: move.name,
			label: englishName(detail?.names, move.name),
			type: detail?.type.name ?? 'unknown',
			typeLabel: detail ? typeLabel(detail.type.name) : '—',
			category: detail?.damage_class ? humanize(detail.damage_class.name) : null,
			power: detail?.power ?? null,
			accuracy: detail?.accuracy ?? null,
			pp: detail?.pp ?? null
		};
		let rows = byMethod.get(method);
		if (!rows) byMethod.set(method, (rows = []));
		rows.push(row);
	}

	const methodRank = (m: string) => {
		const i = METHOD_ORDER.indexOf(m);
		return i === -1 ? METHOD_ORDER.length : i;
	};
	const moveTables = [...byMethod]
		.map(([method, rows]) => ({
			method,
			label: humanize(method),
			rows: rows.sort(
				(a, b) => (method === 'level-up' ? (a.level ?? 0) - (b.level ?? 0) : 0) || a.label.localeCompare(b.label)
			)
		}))
		.sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));

	const stats = pokemon.stats.map((s) => ({
		name: s.stat.name,
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat
	}));

	return {
		id: species.id,
		name: species.name,
		title: englishName(species.names, species.name),
		genus: species.genera.find((g) => g.language.name === 'en')?.genus ?? null,
		flavorText: lastEnglishFlavorText(species.flavor_text_entries),
		artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default ?? null,
		height: pokemon.height,
		weight: pokemon.weight,
		types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => ({ name: t.type.name, label: typeLabel(t.type.name) })),
		stats,
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
		evolution: chain ? toTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
		games: groups.map(({ name, label }) => ({ name, label })),
		game,
		moveTables
	};
};
