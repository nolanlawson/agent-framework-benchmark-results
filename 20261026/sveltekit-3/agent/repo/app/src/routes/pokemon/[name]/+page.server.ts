import { error, redirect } from '@sveltejs/kit';
import { humanize } from '#lib/format.ts';
import {
	getEvolutionChain,
	getMove,
	getPokemon,
	getSpecies,
	getTypeLabels,
	getVersionGroupOrders,
	typeTag,
	type ChainNode
} from '#lib/server/pokedex.ts';
import type { EvolutionNode, MoveRow, MoveTable } from '#lib/types.ts';
import type { PageServerLoad } from './$types';

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed'
};

/** Learn methods shown first, in this order; any others follow alphabetically. */
const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function methodRank(method: string) {
	const i = METHOD_ORDER.indexOf(method);
	return i === -1 ? METHOD_ORDER.length : i;
}

function toEvolutionNode(node: ChainNode): EvolutionNode {
	return { name: node.name, label: humanize(node.name), evolvesTo: node.evolvesTo.map(toEvolutionNode) };
}

export const load: PageServerLoad = async ({ params, url }) => {
	const species = await getSpecies(params.name.toLowerCase());
	if (!species) error(404, 'Not found');
	if (params.name !== species.name) redirect(308, `/pokemon/${species.name}${url.search}`);

	const [pokemon, chain, typeLabels, versionGroupOrders] = await Promise.all([
		species.defaultPokemonUrl ? getPokemon(species.defaultPokemonUrl) : null,
		species.evolutionChainUrl ? getEvolutionChain(species.evolutionChainUrl) : null,
		getTypeLabels(),
		getVersionGroupOrders()
	]);
	if (!pokemon) error(404, 'Not found');

	// Games (version groups) in which this Pokémon learns moves, oldest first.
	const order = (name: string) => versionGroupOrders.get(name) ?? Number.MAX_SAFE_INTEGER;
	const games = [...new Set(pokemon.moves.map((m) => m.versionGroup))]
		.sort((a, b) => order(a) - order(b))
		.map((name) => ({ name, label: humanize(name) }));
	const requestedGame = url.searchParams.get('game');
	const game = games.find((g) => g.name === requestedGame)?.name ?? games.at(-1)?.name ?? null;

	const learned = pokemon.moves.filter((m) => m.versionGroup === game);
	const moves = new Map(
		await Promise.all([...new Set(learned.map((m) => m.move))].map(async (name) => [name, await getMove(name)] as const))
	);

	const tablesByMethod = new Map<string, MoveRow[]>();
	for (const entry of learned) {
		const move = moves.get(entry.move);
		if (!move) continue;
		let rows = tablesByMethod.get(entry.method);
		if (!rows) tablesByMethod.set(entry.method, (rows = []));
		rows.push({
			level: entry.method === 'level-up' ? entry.level : null,
			name: move.name,
			label: move.label,
			type: typeTag(move.type, typeLabels),
			category: move.damageClass ? humanize(move.damageClass) : null,
			power: move.power,
			accuracy: move.accuracy,
			pp: move.pp
		});
	}
	const moveTables: MoveTable[] = [...tablesByMethod]
		.map(([method, rows]) => ({ method, label: humanize(method), rows }))
		.sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));

	const stats = pokemon.stats.map((s) => ({ name: s.name, label: STAT_LABELS[s.name] ?? humanize(s.name), value: s.value }));

	return {
		id: species.id,
		name: species.name,
		label: species.label,
		genus: species.genus,
		flavorText: species.flavorText,
		types: pokemon.types.map((t) => typeTag(t, typeLabels)),
		artwork: pokemon.artwork,
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		stats,
		abilities: pokemon.abilities.map((a) => ({ ...a, label: humanize(a.name) })),
		evolution: chain ? toEvolutionNode(chain) : { name: species.name, label: humanize(species.name), evolvesTo: [] },
		games,
		game,
		moveTables
	};
};
