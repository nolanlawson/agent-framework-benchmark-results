import { defineRoute } from '@gracile/gracile/route';
import { html } from '@gracile/gracile/server-html';

import { document } from '../document.js';
import { isBuildRender } from '../lib/build.js';
import { getPokemonIndex } from '../lib/data.js';
import { homeUrl, type HomeFilters } from '../lib/home-url.js';
import { cardList } from '../lib/templates.js';

const PAGE_SIZE = 48;

export default defineRoute({
	handler: async ({ url }) => {
		const { entries, types, generations } = isBuildRender(url)
			? { entries: [], types: [], generations: [] }
			: await getPokemonIndex();
		const typeLabels = new Map(types.map((t) => [t.name, t.label]));

		const rawType = url.searchParams.get('type') ?? '';
		const rawGeneration = url.searchParams.get('generation') ?? '';
		const q = url.searchParams.get('q') ?? '';
		const type = typeLabels.has(rawType) ? rawType : '';
		const generation = generations.some((g) => g.name === rawGeneration) ? rawGeneration : '';

		const needle = q.trim().toLowerCase();
		const matches = entries.filter(
			(e) =>
				(!needle || e.label.toLowerCase().includes(needle)) &&
				(!type || e.types.includes(type)) &&
				(!generation || e.generation === generation),
		);

		const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
		const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
		const page = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1;

		const cards = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((e) => ({
			...e,
			types: e.types.map((t) => ({ name: t, label: typeLabels.get(t) ?? t })),
		}));

		return {
			filters: { q, type, generation, page } satisfies HomeFilters,
			count: matches.length,
			totalPages,
			cards,
			types: types.map((t) => ({ name: t.name, label: t.label })),
			generations: generations.map((g) => ({ name: g.name, label: g.label })),
		};
	},

	document: (context) => document({ ...context, title: null }),

	template: ({ props }) => {
		const { filters, count, totalPages, cards } = props;
		const { page } = filters;
		return html`
			<h1>Pokémon</h1>

			<pokemon-filters>
				<form class="filters" method="get" action="/" role="search">
					<div class="field field--search">
						<label for="filter-q">Search</label>
						<input id="filter-q" type="search" name="q" value=${filters.q} autocomplete="off" />
					</div>
					<div class="field">
						<label for="filter-type">Type</label>
						<select id="filter-type" name="type">
							<option value="" ?selected=${!filters.type}>All types</option>
							${props.types.map(
								(t) => html`<option value=${t.name} ?selected=${t.name === filters.type}>${t.label}</option>`,
							)}
						</select>
					</div>
					<div class="field">
						<label for="filter-generation">Generation</label>
						<select id="filter-generation" name="generation">
							<option value="" ?selected=${!filters.generation}>All generations</option>
							${props.generations.map(
								(g) =>
									html`<option value=${g.name} ?selected=${g.name === filters.generation}>${g.label}</option>`,
							)}
						</select>
					</div>
					<noscript><button type="submit">Apply</button></noscript>
				</form>
			</pokemon-filters>

			<div id="results" class="results" aria-live="polite">
				<p class="count">${count} Pokémon</p>
				${count === 0
					? html`<p class="empty">No Pokémon found</p>`
					: html`
							${cardList(cards)}
							<nav class="pagination" aria-label="Pagination">
								${page > 1
									? html`<a href=${homeUrl({ ...filters, page: page - 1 })} rel="prev">Previous page</a>`
									: null}
								<span>Page ${page} of ${totalPages}</span>
								${page < totalPages
									? html`<a href=${homeUrl({ ...filters, page: page + 1 })} rel="next">Next page</a>`
									: null}
							</nav>
						`}
			</div>
		`;
	},
});
