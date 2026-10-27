import { humanize } from '#lib/format.ts';
import {
	cleanText,
	english,
	englishName,
	fetchApi,
	fetchByName,
	fetchOr404,
	getTypeLabels,
	getVersionGroupOrders,
	lastEnglish,
	typeRef,
	type NamedRef
} from '#lib/server/api.ts';
import type { EvolutionNode, MoveRow, MoveTable } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

interface Species {
	id: number;
	name: string;
	names: { name: string; language: NamedRef }[];
	genera: { genus: string; language: NamedRef }[];
	flavor_text_entries: { flavor_text: string; language: NamedRef }[];
	evolution_chain: { url: string } | null;
	varieties: { is_default: boolean; pokemon: NamedRef }[];
}

interface Pokemon {
	id: number;
	name: string;
	height: number;
	weight: number;
	types: { slot: number; type: NamedRef }[];
	abilities: { slot: number; is_hidden: boolean; ability: NamedRef }[];
	stats: { base_stat: number; stat: NamedRef }[];
	sprites: { front_default: string | null; other?: Record<string, { front_default?: string | null }> };
	moves: {
		move: NamedRef;
		version_group_details: {
			level_learned_at: number;
			version_group: NamedRef;
			move_learn_method: NamedRef;
		}[];
	}[];
}

interface ChainLink {
	species: NamedRef;
	evolves_to: ChainLink[];
}

interface Move {
	name: string;
	names: { name: string; language: NamedRef }[];
	type: NamedRef;
	damage_class: NamedRef | null;
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

function toEvolutionNode(link: ChainLink): EvolutionNode {
	return {
		name: link.species.name,
		label: humanize(link.species.name),
		children: link.evolves_to.map(toEvolutionNode)
	};
}

export const load: PageServerLoad = async ({ params, url }) => {
	const species = await fetchByName<Species>('pokemon-species', params.name);
	const variety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];

	const [pokemon, chain, typeLabels, versionGroupOrders] = await Promise.all([
		fetchOr404<Pokemon>(variety?.pokemon.url ?? `pokemon/${species.id}/`),
		species.evolution_chain ? fetchApi<{ chain: ChainLink }>(species.evolution_chain.url) : null,
		getTypeLabels(),
		getVersionGroupOrders()
	]);

	const name = englishName(species.names, species.name);
	const flavor = lastEnglish(species.flavor_text_entries);

	// Version groups in which the Pokémon learns moves, oldest first.
	const groupNames = new Set(
		pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))
	);
	const games = [...groupNames]
		.sort((a, b) => (versionGroupOrders.get(a) ?? Infinity) - (versionGroupOrders.get(b) ?? Infinity))
		.map((group) => ({ name: group, label: humanize(group) }));
	const requestedGame = url.searchParams.get('game');
	const game = games.some((g) => g.name === requestedGame) ? requestedGame! : (games.at(-1)?.name ?? '');

	// Rows for the selected version group, grouped by learn method.
	const learned: { move: NamedRef; method: string; level: number }[] = [];
	const seen = new Set<string>();
	for (const { move, version_group_details } of pokemon.moves) {
		for (const detail of version_group_details) {
			if (detail.version_group.name !== game) continue;
			const method = detail.move_learn_method.name;
			const key = `${move.name}|${method}|${detail.level_learned_at}`;
			if (seen.has(key)) continue;
			seen.add(key);
			learned.push({ move, method, level: detail.level_learned_at });
		}
	}

	const moveDetails = new Map(
		await Promise.all(
			[...new Map(learned.map((l) => [l.move.name, l.move])).values()].map(
				async (ref) => [ref.name, await fetchApi<Move>(ref.url)] as const
			)
		)
	);

	const tables = new Map<string, MoveRow[]>();
	for (const { move: ref, method, level } of learned) {
		const move = moveDetails.get(ref.name);
		if (!move) continue;
		let rows = tables.get(method);
		if (!rows) tables.set(method, (rows = []));
		rows.push({
			level: method === 'level-up' ? level : null,
			name: move.name,
			label: englishName(move.names, move.name),
			type: typeRef(move.type.name, typeLabels),
			category: move.damage_class ? humanize(move.damage_class.name) : null,
			power: move.power,
			accuracy: move.accuracy,
			pp: move.pp
		});
	}

	const rank = (method: string) => {
		const i = METHOD_ORDER.indexOf(method);
		return i === -1 ? METHOD_ORDER.length : i;
	};
	const moveTables: MoveTable[] = [...tables]
		.sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
		.map(([method, rows]) => ({
			method,
			label: humanize(method),
			rows: rows.sort(
				(a, b) => (a.level ?? 0) - (b.level ?? 0) || a.label.localeCompare(b.label)
			)
		}));

	const stats = pokemon.stats.map((s) => ({
		name: s.stat.name,
		label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
		value: s.base_stat
	}));

	return {
		id: species.id,
		name,
		genus: english(species.genera)?.genus ?? null,
		flavorText: flavor ? cleanText(flavor.flavor_text) : null,
		artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default,
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		types: [...pokemon.types].sort((a, b) => a.slot - b.slot).map((t) => typeRef(t.type.name, typeLabels)),
		stats,
		total: stats.reduce((sum, s) => sum + s.value, 0),
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
		evolution: chain
			? toEvolutionNode(chain.chain)
			: { name: species.name, label: humanize(species.name), children: [] },
		games,
		game,
		moveTables
	};
};
