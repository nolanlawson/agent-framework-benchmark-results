import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../../document.js';
import { isBuildRender } from '../../lib/build.js';
import { api, apiPath, apiRequired } from '../../lib/api.js';
import { getTypeLabels, getVersionGroupOrders, typeLabel } from '../../lib/data.js';
import {
	dexNumber,
	EM_DASH,
	englishName,
	humanize,
	latestEnglishFlavorText,
	orDash,
	type Localized,
	type NamedRef,
} from '../../lib/format.js';
import { notFound, section, typeLink } from '../../lib/templates.js';

type Species = {
	id: number;
	name: string;
	names: Localized[];
	genera: Array<{ genus: string; language: NamedRef }>;
	flavor_text_entries: Array<{ flavor_text: string; language: NamedRef }>;
	evolution_chain: { url: string } | null;
	varieties: Array<{ is_default: boolean; pokemon: NamedRef }>;
};

type Pokemon = {
	id: number;
	name: string;
	height: number;
	weight: number;
	sprites: { other?: { 'official-artwork'?: { front_default: string | null } }; front_default: string | null };
	types: Array<{ slot: number; type: NamedRef }>;
	abilities: Array<{ slot: number; is_hidden: boolean; ability: NamedRef }>;
	stats: Array<{ base_stat: number; stat: NamedRef }>;
	moves: Array<{
		move: NamedRef;
		version_group_details: Array<{
			level_learned_at: number;
			version_group: NamedRef;
			move_learn_method: NamedRef;
		}>;
	}>;
};

type ChainLink = { species: NamedRef; evolves_to: ChainLink[] };

type Move = {
	name: string;
	names: Localized[];
	type: NamedRef;
	damage_class: NamedRef | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
};

export type MoveRow = {
	level: number | null;
	name: string;
	label: string;
	type: { name: string; label: string };
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
};

const STAT_LABELS: Record<string, string> = {
	hp: 'HP',
	attack: 'Attack',
	defense: 'Defense',
	'special-attack': 'Sp. Atk',
	'special-defense': 'Sp. Def',
	speed: 'Speed',
};
const STAT_MAX = 255;

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];
const methodRank = (method: string) => {
	const i = METHOD_ORDER.indexOf(method);
	return i === -1 ? METHOD_ORDER.length : i;
};

const byLabel = (a: MoveRow, b: MoveRow) => a.label.localeCompare(b.label);

async function loadPokemonPage(name: string, requestedGame: string | null) {
	const species = await api<Species>(`pokemon-species/${encodeURIComponent(name.toLowerCase())}/`);
	if (!species) return null;

	const defaultVariety = species.varieties.find((v) => v.is_default) ?? species.varieties[0];
	const [pokemon, chain, typeLabels] = await Promise.all([
		apiRequired<Pokemon>(defaultVariety ? apiPath(defaultVariety.pokemon.url) : `pokemon/${species.id}/`),
		species.evolution_chain
			? api<{ chain: ChainLink }>(apiPath(species.evolution_chain.url))
			: Promise.resolve(null),
		getTypeLabels(),
	]);

	// Games (version groups) in which this Pokémon learns moves.
	const gameNames = [
		...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
	];
	const orders = await getVersionGroupOrders(gameNames);
	const games = gameNames
		.sort((a, b) => orders.get(a)! - orders.get(b)! || a.localeCompare(b))
		.map((g) => ({ name: g, label: humanize(g) }));
	const game =
		requestedGame && gameNames.includes(requestedGame) ? requestedGame : (games.at(-1)?.name ?? null);

	// Moves learned in the selected game, grouped by learn method.
	const learned = pokemon.moves.flatMap((m) =>
		m.version_group_details
			.filter((d) => d.version_group.name === game)
			.map((d) => ({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at })),
	);
	const moveDetails = new Map(
		await Promise.all(
			[...new Set(learned.map((l) => l.move.url))].map(
				async (url) => [url, await api<Move>(apiPath(url))] as const,
			),
		),
	);

	const tables = new Map<string, MoveRow[]>();
	const seen = new Set<string>();
	for (const { move, method, level } of learned) {
		const key = `${method}|${move.name}|${method === 'level-up' ? level : ''}`;
		if (seen.has(key)) continue;
		seen.add(key);
		const detail = moveDetails.get(move.url);
		const typeName = detail?.type.name ?? 'unknown';
		const rows = tables.get(method) ?? [];
		rows.push({
			level: method === 'level-up' ? level : null,
			name: move.name,
			label: englishName(detail?.names, move.name),
			type: { name: typeName, label: typeLabel(typeLabels, typeName) },
			category: detail?.damage_class ? humanize(detail.damage_class.name) : null,
			power: detail?.power ?? null,
			accuracy: detail?.accuracy ?? null,
			pp: detail?.pp ?? null,
		});
		tables.set(method, rows);
	}
	const moveTables = [...tables.entries()]
		.sort(([a], [b]) => methodRank(a) - methodRank(b) || a.localeCompare(b))
		.map(([method, rows]) => ({
			method,
			label: humanize(method),
			rows: rows.sort(method === 'level-up' ? (a, b) => (a.level ?? 0) - (b.level ?? 0) || byLabel(a, b) : byLabel),
		}));

	const englishGenus = species.genera.find((g) => g.language.name === 'en')?.genus ?? null;
	const total = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

	return {
		id: species.id,
		name: species.name,
		label: englishName(species.names, species.name),
		genus: englishGenus,
		artwork: pokemon.sprites.other?.['official-artwork']?.front_default ?? pokemon.sprites.front_default,
		types: [...pokemon.types]
			.sort((a, b) => a.slot - b.slot)
			.map((t) => ({ name: t.type.name, label: typeLabel(typeLabels, t.type.name) })),
		height: (pokemon.height / 10).toFixed(1),
		weight: (pokemon.weight / 10).toFixed(1),
		flavorText: latestEnglishFlavorText(species.flavor_text_entries),
		stats: pokemon.stats.map((s) => ({
			label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
			value: s.base_stat,
		})),
		total,
		abilities: [...pokemon.abilities]
			.sort((a, b) => a.slot - b.slot)
			.map((a) => ({ name: a.ability.name, label: humanize(a.ability.name), hidden: a.is_hidden })),
		chain: chain?.chain ?? { species: { name: species.name, url: '' }, evolves_to: [] },
		games,
		game,
		moveTables,
	};
}

type PageData = NonNullable<Awaited<ReturnType<typeof loadPokemonPage>>>;

const statBar = (value: number, max: number) =>
	html`<div class="stat-bar"><div class="stat-bar__fill" style=${`width: ${Math.min(100, (value / max) * 100).toFixed(1)}%`}></div></div>`;

const evolutionTree = (links: ChainLink[]): unknown => html`
	<ul>
		${links.map(
			(link) => html`
				<li>
					<a href=${`/pokemon/${link.species.name}`}>${humanize(link.species.name)}</a>
					${link.evolves_to.length ? evolutionTree(link.evolves_to) : null}
				</li>
			`,
		)}
	</ul>
`;

const COLUMNS: Array<{ key: keyof MoveRow; label: string; numeric?: boolean }> = [
	{ key: 'level', label: 'Level', numeric: true },
	{ key: 'label', label: 'Move' },
	{ key: 'type', label: 'Type' },
	{ key: 'category', label: 'Category' },
	{ key: 'power', label: 'Power', numeric: true },
	{ key: 'accuracy', label: 'Accuracy', numeric: true },
	{ key: 'pp', label: 'PP', numeric: true },
];

const sortValue = (row: MoveRow, key: keyof MoveRow) => {
	if (key === 'type') return row.type.label;
	const value = row[key];
	return value === null || value === undefined ? '' : String(value);
};

const cell = (row: MoveRow, key: keyof MoveRow) => {
	switch (key) {
		case 'label':
			return html`<a href=${`/moves/${row.name}`}>${row.label}</a>`;
		case 'type':
			return typeLink(row.type);
		default:
			return orDash(row[key] as string | number | null);
	}
};

const movesTable = (table: PageData['moveTables'][number]) => {
	const columns = COLUMNS.filter((c) => c.key !== 'level' || table.method === 'level-up');
	return html`
		<sortable-table class="table-scroll">
			<table class="moves-table">
				<caption>${table.label}</caption>
				<thead>
					<tr>
						${columns.map(
							(c) => html`
								<th scope="col" data-key=${c.key} data-type=${c.numeric ? 'number' : 'text'}>
									<button type="button">${c.label}</button>
								</th>
							`,
						)}
					</tr>
				</thead>
				<tbody>
					${table.rows.map(
						(row) => html`
							<tr>
								${columns.map((c) => html`<td data-sort=${sortValue(row, c.key)}>${cell(row, c.key)}</td>`)}
							</tr>
						`,
					)}
				</tbody>
			</table>
		</sortable-table>
	`;
};

const movesContent = (data: PageData, path: string) => html`
	<game-picker>
		<form class="game-form" method="get" action=${`${path}#moves`}>
			<label for="game">Game</label>
			<select id="game" name="game">
				${data.games.map(
					(g) => html`<option value=${g.name} ?selected=${g.name === data.game}>${g.label}</option>`,
				)}
			</select>
			<noscript><button type="submit">Show</button></noscript>
		</form>
	</game-picker>
	<div class="moves-tables" id="moves-tables">
		${data.moveTables.length
			? data.moveTables.map(movesTable)
			: html`<p class="muted">This Pokémon learns no moves.</p>`}
	</div>
`;

export default defineRoute({
	handler: async ({ params, url, responseInit }) => {
		if (isBuildRender(url)) return { data: null, path: url.pathname };
		const data = await loadPokemonPage(String(params.name ?? ''), url.searchParams.get('game'));
		if (!data) responseInit.status = 404;
		return { data, path: url.pathname };
	},

	document: (context) => document({ ...context, title: context.props.data?.label ?? 'Not found' }),

	template: ({ props: { data, path } }) => {
		if (!data) return notFound();
		return html`
			<div class="pokemon-summary">
				<div class="pokemon-summary__art">
					${data.artwork
						? html`<img src=${data.artwork} alt=${data.label} width="475" height="475" />`
						: null}
				</div>
				<div class="pokemon-summary__info">
					<p class="dex-number">${dexNumber(data.id)}</p>
					<h1>${data.label}</h1>
					${data.genus ? html`<p class="genus">${data.genus}</p>` : null}
					<p class="type-list">${data.types.map(typeLink)}</p>
					<dl class="facts">
						<div><dt>Height</dt><dd>${data.height} m</dd></div>
						<div><dt>Weight</dt><dd>${data.weight} kg</dd></div>
					</dl>
					<p class="flavor-text">${data.flavorText ?? EM_DASH}</p>
				</div>
			</div>

			${section(
				'stats',
				'Base stats',
				html`
					<table class="stats-table">
						<tbody>
							${data.stats.map(
								(s) => html`
									<tr>
										<th scope="row">${s.label}</th>
										<td class="stats-table__value">${s.value}</td>
										<td class="stats-table__bar">${statBar(s.value, STAT_MAX)}</td>
									</tr>
								`,
							)}
							<tr class="stats-table__total">
								<th scope="row">Total</th>
								<td class="stats-table__value">${data.total}</td>
								<td class="stats-table__bar">${statBar(data.total, STAT_MAX * 6)}</td>
							</tr>
						</tbody>
					</table>
				`,
			)}

			${section(
				'abilities',
				'Abilities',
				html`
					<ul class="bullets">
						${data.abilities.map(
							(a) =>
								html`<li><a href=${`/abilities/${a.name}`}>${a.label}</a>${a.hidden ? ' (hidden)' : ''}</li>`,
						)}
					</ul>
				`,
			)}

			${section('evolution', 'Evolution', html`<div class="evolution">${evolutionTree([data.chain])}</div>`)}

			${section('moves', 'Moves', movesContent(data, path), 'moves-panel')}
		`;
	},
});
