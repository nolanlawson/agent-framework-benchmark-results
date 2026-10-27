// The home page's search, filters and paginated results. Server-rendered with
// the first results, then hydrated: filter changes fetch new results from
// `/api/browse` and update the URL without a page load.

import { LitElement, css, html, nothing, unsafeCSS } from 'lit';

import badgesCss from '../styles/badges.css?inline';
import cardsCss from '../styles/cards.css?inline';
import controlsCss from '../styles/controls.css?inline';
import {
	browseQuery,
	parseBrowseState,
	type BrowseOptions,
	type BrowseResult,
	type BrowseState,
} from '../lib/format.js';
import { pokemonCards } from '../templates/partials.js';

const SEARCH_DEBOUNCE_MS = 150;

export class PokedexBrowser extends LitElement {
	static override properties = {
		state: { type: Object },
		result: { type: Object },
		options: { type: Object },
	};

	declare state: BrowseState;
	declare result: BrowseResult;
	declare options: BrowseOptions;

	#request = 0;
	#searchTimer: ReturnType<typeof setTimeout> | undefined;

	constructor() {
		super();
		this.state = { q: '', type: '', generation: '', page: 1 };
		this.result = { count: 0, page: 1, totalPages: 1, items: [] };
		this.options = { types: [], generations: [] };
	}

	override connectedCallback(): void {
		super.connectedCallback();
		window.addEventListener('popstate', this.#onPopState);
	}

	override disconnectedCallback(): void {
		super.disconnectedCallback();
		window.removeEventListener('popstate', this.#onPopState);
	}

	#onPopState = () => {
		if (location.pathname !== '/') return;
		this.state = parseBrowseState(new URLSearchParams(location.search));
		void this.#load();
		// The form controls may have been edited by the user, so their values
		// no longer follow their attributes.
		void this.updateComplete.then(() => {
			const root = this.renderRoot;
			root.querySelector<HTMLInputElement>('#search')!.value = this.state.q;
			root.querySelector<HTMLSelectElement>('#type')!.value = this.state.type;
			root.querySelector<HTMLSelectElement>('#generation')!.value = this.state.generation;
		});
	};

	#change(patch: Partial<BrowseState>, historyMode: 'push' | 'replace') {
		this.state = { ...this.state, ...patch, page: 1 };
		const url = `/${browseQuery(this.state)}`;
		if (historyMode === 'push') history.pushState(null, '', url);
		else history.replaceState(null, '', url);
		void this.#load();
	}

	async #load() {
		const request = ++this.#request;
		const response = await fetch(`/api/browse${browseQuery(this.state)}`);
		if (!response.ok) return;
		const result = (await response.json()) as BrowseResult;
		if (request === this.#request) this.result = result;
	}

	#onSearch(event: Event) {
		const q = (event.target as HTMLInputElement).value;
		clearTimeout(this.#searchTimer);
		this.#searchTimer = setTimeout(() => this.#change({ q }, 'replace'), SEARCH_DEBOUNCE_MS);
	}

	#onSelect(key: 'type' | 'generation', event: Event) {
		this.#change({ [key]: (event.target as HTMLSelectElement).value }, 'push');
	}

	override render() {
		const { state, result, options } = this;
		const pageUrl = (page: number) => `/${browseQuery({ ...state, page })}`;
		return html`
			<form class="filters" role="search" @submit=${(e: Event) => e.preventDefault()}>
				<div class="field search">
					<label for="search">Search</label>
					<input id="search" type="search" name="q" autocomplete="off" value=${state.q} @input=${this.#onSearch} />
				</div>
				<div class="field">
					<label for="type">Type</label>
					<select id="type" name="type" @change=${(e: Event) => this.#onSelect('type', e)}>
						<option value="" ?selected=${!state.type}>All types</option>
						${options.types.map(
							(t) => html`<option value=${t.name} ?selected=${t.name === state.type}>${t.label}</option>`,
						)}
					</select>
				</div>
				<div class="field">
					<label for="generation">Generation</label>
					<select id="generation" name="generation" @change=${(e: Event) => this.#onSelect('generation', e)}>
						<option value="" ?selected=${!state.generation}>All generations</option>
						${options.generations.map(
							(g) => html`<option value=${g.name} ?selected=${g.name === state.generation}>${g.label}</option>`,
						)}
					</select>
				</div>
			</form>

			<p class="count" role="status">${result.count ? `${result.count} Pokémon` : 'No Pokémon found'}</p>
			${result.count
				? html`${pokemonCards(result.items)}
						<nav class="pagination" aria-label="Pagination">
							${result.page > 1 ? html`<a href=${pageUrl(result.page - 1)} rel="prev">Previous page</a>` : nothing}
							<span>Page ${result.page} of ${result.totalPages}</span>
							${result.page < result.totalPages
								? html`<a href=${pageUrl(result.page + 1)} rel="next">Next page</a>`
								: nothing}
						</nav>`
				: nothing}
		`;
	}

	static override styles = [
		unsafeCSS(controlsCss),
		unsafeCSS(badgesCss),
		unsafeCSS(cardsCss),
		css`
			.filters {
				display: grid;
				grid-template-columns: 2fr 1fr 1fr;
				gap: var(--space-3);
				margin-bottom: var(--space-4);
			}
			.field {
				display: flex;
				flex-direction: column;
				gap: var(--space-1);
			}
			.field input,
			.field select {
				width: 100%;
			}
			.pagination {
				display: flex;
				justify-content: center;
				align-items: baseline;
				gap: var(--space-5);
				margin-top: var(--space-5);
				font-size: var(--text-sm);
			}
			@media (max-width: 40rem) {
				.filters {
					grid-template-columns: 1fr;
				}
			}
		`,
	];
}

customElements.define('pokedex-browser', PokedexBrowser);

declare global {
	interface HTMLElementTagNameMap {
		'pokedex-browser': PokedexBrowser;
	}
}
