import { defineRoute } from '@gracile/gracile/route';
import { html, nothing, type TemplateResult } from 'lit';

import { type EvolutionNode, getPokemonPage, type MoveTable } from '../../lib/data.js';
import { dexNumber, orDash } from '../../lib/format.js';
import { isBuildStep } from '../../lib/api.js';
import { document } from '../../document.js';
import { section, typeBadge } from '../../templates/components.js';
import { NOT_FOUND_TITLE, notFound } from '../../templates/not-found.js';

/** Bars are scaled against the highest possible base stat. */
const MAX_STAT = 255;

const COLUMNS = [
	{ key: 'level', label: 'Level', numeric: true },
	{ key: 'move', label: 'Move', numeric: false },
	{ key: 'type', label: 'Type', numeric: false },
	{ key: 'category', label: 'Category', numeric: false },
	{ key: 'power', label: 'Power', numeric: true },
	{ key: 'accuracy', label: 'Accuracy', numeric: true },
	{ key: 'pp', label: 'PP', numeric: true },
] as const;

const statBar = (value: number, max: number) => html`
	<td class="stat-bar" aria-hidden="true">
		<span class="bar"><span style=${`width: ${Math.min(100, (value / max) * 100).toFixed(1)}%`}></span></span>
	</td>
`;

const evolutionList = (nodes: EvolutionNode[]): TemplateResult => html`
	<ul>
		${nodes.map(
			(node) => html`
				<li>
					<a href="/pokemon/${node.name}">${node.label}</a>
					${node.evolvesTo.length ? evolutionList(node.evolvesTo) : nothing}
				</li>
			`,
		)}
	</ul>
`;

// Rows carry their sort keys as data attributes; the client script sorts by them.
const movesTable = (table: MoveTable) => {
	const columns = COLUMNS.filter((column) => column.key !== 'level' || table.method === 'level-up');
	return html`
		<div class="table-scroll">
			<table class="moves-table" data-sortable>
				<caption>${table.label}</caption>
				<thead>
					<tr>
						${columns.map(
							(column) => html`
								<th scope="col" data-key=${column.key} data-numeric=${column.numeric ? 'true' : 'false'}>
									<button type="button">${column.label}<span class="sort-indicator" aria-hidden="true"></span></button>
								</th>
							`,
						)}
					</tr>
				</thead>
				<tbody>
					${table.rows.map(
						(row) => html`
							<tr
								data-level=${row.level ?? ''}
								data-move=${row.label}
								data-type=${row.type.label}
								data-category=${row.category ?? ''}
								data-power=${row.power ?? ''}
								data-accuracy=${row.accuracy ?? ''}
								data-pp=${row.pp ?? ''}
							>
								${table.method === 'level-up' ? html`<td>${row.level}</td>` : nothing}
								<td><a href="/moves/${row.name}">${row.label}</a></td>
								<td>${typeBadge(row.type)}</td>
								<td>${orDash(row.category)}</td>
								<td>${orDash(row.power)}</td>
								<td>${orDash(row.accuracy)}</td>
								<td>${orDash(row.pp)}</td>
							</tr>
						`,
					)}
				</tbody>
			</table>
		</div>
	`;
};

export default defineRoute({
	handler: async ({ params, url, responseInit }) => {
		if (isBuildStep()) return { pokemon: null };
		const pokemon = await getPokemonPage(params['name'], url.searchParams.get('game'));
		if (!pokemon) responseInit.status = 404;
		return { pokemon };
	},

	document: (context) => document({ ...context, title: context.props.pokemon?.label ?? NOT_FOUND_TITLE }),

	template: ({ props: { pokemon } }) => {
		if (!pokemon) return notFound();
		const total = pokemon.stats.reduce((sum, stat) => sum + stat.value, 0);

		return html`
			<div class="pokemon-summary panel">
				<div class="artwork">
					${pokemon.artwork
						? html`<img src=${pokemon.artwork} alt=${pokemon.label} width="475" height="475" />`
						: nothing}
				</div>
				<div class="summary-info">
					<p class="dex-number">${dexNumber(pokemon.id)}</p>
					<h1>${pokemon.label}</h1>
					${pokemon.genus ? html`<p class="genus">${pokemon.genus}</p>` : nothing}
					<p class="type-list">${pokemon.types.map((type) => typeBadge(type))}</p>
					<dl class="measurements">
						<div><dt>Height</dt><dd>${pokemon.height}</dd></div>
						<div><dt>Weight</dt><dd>${pokemon.weight}</dd></div>
					</dl>
					${pokemon.flavorText ? html`<p class="flavor-text">${pokemon.flavorText}</p>` : nothing}
				</div>
			</div>

			${section(
				'stats',
				'Base stats',
				html`
					<table class="stats-table">
						<tbody>
							${pokemon.stats.map(
								(stat) => html`
									<tr>
										<th scope="row">${stat.label}</th>
										<td class="stat-value">${stat.value}</td>
										${statBar(stat.value, MAX_STAT)}
									</tr>
								`,
							)}
							<tr class="stat-total">
								<th scope="row">Total</th>
								<td class="stat-value">${total}</td>
								${statBar(total, MAX_STAT * pokemon.stats.length)}
							</tr>
						</tbody>
					</table>
				`,
			)}
			${section(
				'abilities',
				'Abilities',
				html`
					<ul class="plain-list">
						${pokemon.abilities.map(
							(ability) => html`
								<li>
									<a href="/abilities/${ability.name}">${ability.label}</a>${ability.hidden ? ' (hidden)' : nothing}
								</li>
							`,
						)}
					</ul>
				`,
			)}
			${section(
				'evolution',
				'Evolution',
				html`<div class="evolution">
					${evolutionList([
						pokemon.evolution ?? { name: pokemon.name, label: pokemon.label, evolvesTo: [] },
					])}
				</div>`,
			)}
			${section(
				'moves',
				'Moves',
				pokemon.games.length
					? html`
							<form class="game-picker" method="get" action="#moves" data-game-form>
								<label for="game">Game</label>
								<select id="game" name="game">
									${pokemon.games.map(
										(game) => html`<option value=${game.name} ?selected=${game.name === pokemon.game}>${game.label}</option>`,
									)}
								</select>
								<noscript><button type="submit">Show</button></noscript>
							</form>
							<div class="move-tables" data-move-tables>${pokemon.moveTables.map(movesTable)}</div>
						`
					: html`<p>No moves.</p>`,
				{ domId: 'moves' },
			)}
		`;
	},
});
