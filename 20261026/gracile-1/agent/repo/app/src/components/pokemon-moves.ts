// A Pokémon's moves for one game (version group): a game picker and one sortable
// table per learn method. Server-rendered, then hydrated for sorting and for
// switching games without a page load.

import { LitElement, css, html, nothing, unsafeCSS } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';

import badgesCss from '../styles/badges.css?inline';
import controlsCss from '../styles/controls.css?inline';
import { humanize, orDash, type TypeRef } from '../lib/format.js';
import { typeBadge } from '../templates/partials.js';

export interface MoveInfo {
	label: string;
	type: TypeRef;
	category: string | null;
	power: number | null;
	accuracy: number | null;
	pp: number | null;
}

export interface MovesData {
	/** Version groups the Pokémon learns moves in, by ascending `order`. */
	versionGroups: TypeRef[];
	moves: Record<string, MoveInfo>;
	/** Version group → [move name, learn method, level]. */
	learn: Record<string, Array<[string, string, number]>>;
}

type ColumnKey = 'level' | 'move' | 'type' | 'category' | 'power' | 'accuracy' | 'pp';
type Direction = 'ascending' | 'descending';

interface Row {
	move: string;
	info: MoveInfo;
	level: number;
}

const COLUMNS: Array<{ key: ColumnKey; label: string; value: (row: Row) => string | number | null }> = [
	{ key: 'level', label: 'Level', value: (r) => r.level },
	{ key: 'move', label: 'Move', value: (r) => r.info.label },
	{ key: 'type', label: 'Type', value: (r) => r.info.type.label },
	{ key: 'category', label: 'Category', value: (r) => r.info.category },
	{ key: 'power', label: 'Power', value: (r) => r.info.power },
	{ key: 'accuracy', label: 'Accuracy', value: (r) => r.info.accuracy },
	{ key: 'pp', label: 'PP', value: (r) => r.info.pp },
];

const METHOD_ORDER = ['level-up', 'machine', 'egg', 'tutor'];

function compareMethods(a: string, b: string): number {
	const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
	return rank(a) - rank(b) || humanize(a).localeCompare(humanize(b));
}

function compareValues(a: string | number | null, b: string | number | null): number {
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	return String(a).localeCompare(String(b));
}

export class PokemonMoves extends LitElement {
	static override properties = {
		data: { type: Object },
		game: { type: String },
		sort: { state: true },
	};

	declare data: MovesData;
	declare game: string;
	declare sort: Record<string, { key: ColumnKey; direction: Direction }>;

	constructor() {
		super();
		this.data = { versionGroups: [], moves: {}, learn: {} };
		this.game = '';
		this.sort = {};
	}

	get #selectedGame(): string {
		const groups = this.data.versionGroups;
		return groups.some((g) => g.name === this.game) ? this.game : (groups.at(-1)?.name ?? '');
	}

	#onGameChange(event: Event) {
		this.game = (event.target as HTMLSelectElement).value;
		this.sort = {};
		const url = new URL(location.href);
		url.searchParams.set('game', this.game);
		history.replaceState(history.state, '', url);
	}

	#onSort(method: string, key: ColumnKey) {
		const current = this.sort[method];
		const direction: Direction =
			current?.key === key && current.direction === 'ascending' ? 'descending' : 'ascending';
		this.sort = { ...this.sort, [method]: { key, direction } };
	}

	/** Rows in default order: by level (level-up only), then by move name. */
	#rows(game: string): Map<string, Row[]> {
		const byMethod = new Map<string, Row[]>();
		for (const [move, method, level] of this.data.learn[game] ?? []) {
			const info = this.data.moves[move];
			if (!info) continue;
			let rows = byMethod.get(method);
			if (!rows) byMethod.set(method, (rows = []));
			rows.push({ move, info, level });
		}
		for (const [method, rows] of byMethod)
			rows.sort(
				(a, b) => (method === 'level-up' ? a.level - b.level : 0) || a.info.label.localeCompare(b.info.label),
			);
		return new Map([...byMethod].sort(([a], [b]) => compareMethods(a, b)));
	}

	#sorted(method: string, rows: Row[]): Row[] {
		const sort = this.sort[method];
		if (!sort) return rows;
		const column = COLUMNS.find((c) => c.key === sort.key)!;
		const sign = sort.direction === 'ascending' ? 1 : -1;
		// Array#sort is stable, so ties keep the default order.
		return [...rows].sort((a, b) => {
			const va = column.value(a);
			const vb = column.value(b);
			if (va === null || vb === null) return (va === null ? 1 : 0) - (vb === null ? 1 : 0);
			return sign * compareValues(va, vb);
		});
	}

	#table(method: string, rows: Row[]) {
		const columns = method === 'level-up' ? COLUMNS : COLUMNS.slice(1);
		const sort = this.sort[method];
		return html`<div class="table-scroll">
			<table>
				<caption>${humanize(method)}</caption>
				<thead>
					<tr>
						${columns.map(
							(c) => html`<th scope="col" aria-sort=${ifDefined(sort?.key === c.key ? sort.direction : undefined)}>
								<button type="button" @click=${() => this.#onSort(method, c.key)}>
									${c.label}<span class="arrow" aria-hidden="true"
										>${sort?.key === c.key ? (sort.direction === 'ascending' ? '▲' : '▼') : ''}</span
									>
								</button>
							</th>`,
						)}
					</tr>
				</thead>
				<tbody>
					${this.#sorted(method, rows).map(
						(row) => html`<tr>
							${method === 'level-up' ? html`<td>${row.level}</td>` : nothing}
							<td><a href="/moves/${row.move}">${row.info.label}</a></td>
							<td>${typeBadge(row.info.type)}</td>
							<td>${orDash(row.info.category)}</td>
							<td>${orDash(row.info.power)}</td>
							<td>${orDash(row.info.accuracy)}</td>
							<td>${orDash(row.info.pp)}</td>
						</tr>`,
					)}
				</tbody>
			</table>
		</div>`;
	}

	override render() {
		const groups = this.data.versionGroups;
		if (!groups.length) return html`<p>This Pokémon doesn't learn any moves.</p>`;
		const game = this.#selectedGame;
		return html`
			<div class="game">
				<label for="game">Game</label>
				<select id="game" @change=${this.#onGameChange}>
					${groups.map((g) => html`<option value=${g.name} ?selected=${g.name === game}>${g.label}</option>`)}
				</select>
			</div>
			${[...this.#rows(game)].map(([method, rows]) => this.#table(method, rows))}
		`;
	}

	static override styles = [
		unsafeCSS(controlsCss),
		unsafeCSS(badgesCss),
		css`
			.game {
				display: flex;
				align-items: center;
				gap: var(--space-3);
				margin-bottom: var(--space-4);
			}
			.game select {
				min-width: 16.5rem;
				max-width: 100%;
			}
			.table-scroll {
				overflow-x: auto;
				margin-bottom: var(--space-5);
			}
			.table-scroll:last-child {
				margin-bottom: 0;
			}
			table {
				width: 100%;
				border-collapse: collapse;
				font-size: var(--text-sm);
			}
			caption {
				padding-bottom: var(--space-2);
				font-size: var(--text-base);
				text-align: left;
			}
			th {
				padding: 0;
				border-bottom: 1px solid var(--color-border);
				font-weight: var(--weight-normal);
				text-align: left;
				white-space: nowrap;
			}
			th button {
				width: 100%;
				padding: var(--space-2) var(--space-3);
				border: 0;
				background: none;
				color: var(--color-text-muted);
				font: inherit;
				text-align: left;
				cursor: pointer;
			}
			th button:hover {
				color: var(--color-text);
			}
			th[aria-sort] button {
				color: var(--color-text);
			}
			.arrow {
				margin-left: var(--space-1);
				font-size: var(--text-xs);
			}
			td {
				padding: var(--space-2) var(--space-3);
				border-bottom: 1px solid var(--color-border);
				white-space: nowrap;
			}
		`,
	];
}

customElements.define('pokemon-moves', PokemonMoves);

declare global {
	interface HTMLElementTagNameMap {
		'pokemon-moves': PokemonMoves;
	}
}
