// The home page's searchable, filterable, paginated list of every species.
// Rendered on the server; after hydration, filtering happens in the browser and the
// filter state is mirrored to the URL query.
import { LitElement, html, css, isServer, nothing, unsafeCSS } from 'lit';
import { live } from 'lit/directives/live.js';

import { humanize } from '../lib/format.js';
import { cardList, countLabel } from '../lib/templates.js';
import componentStyles from '../styles/components.css?inline';

export const PAGE_SIZE = 48;

export function readFilters(searchParams) {
  const page = Number.parseInt(searchParams.get('page') ?? '1', 10);
  return {
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? '',
    generation: searchParams.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function filtersQuery({ q, type, generation, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `?${query}` : '';
}

export class PokemonBrowser extends LitElement {
  static properties = {
    index: { type: Object },
    apiBase: { attribute: 'api-base' },
    q: {},
    type: {},
    generation: {},
    page: { type: Number },
  };

  static styles = [
    unsafeCSS(componentStyles),
    css`
      :host {
        display: block;
      }
    `,
  ];

  constructor() {
    super();
    this.index = { types: [], generations: [], species: [] };
    this.apiBase = '';
    this.q = '';
    this.type = '';
    this.generation = '';
    this.page = 1;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!isServer) window.addEventListener('popstate', this.#onPopState);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (!isServer) window.removeEventListener('popstate', this.#onPopState);
  }

  get #filters() {
    return { q: this.q, type: this.type, generation: this.generation, page: this.page };
  }

  #onPopState = () => {
    Object.assign(this, readFilters(new URL(location.href).searchParams));
  };

  #navigate(changes, { push = true } = {}) {
    Object.assign(this, changes);
    const url = `${location.pathname}${filtersQuery(this.#filters)}`;
    if (url !== `${location.pathname}${location.search}`) {
      history[push ? 'pushState' : 'replaceState'](null, '', url);
    }
  }

  #matches() {
    const { types, generations, species } = this.index;
    const query = this.q.trim().toLowerCase();
    const typeIndex = this.type ? types.findIndex((t) => t.name === this.type) : -1;
    const generationIndex = this.generation ? generations.findIndex((g) => g.name === this.generation) : -1;
    return species.filter(([, name, generation, ...typeIndexes]) => {
      if (this.type && !typeIndexes.includes(typeIndex)) return false;
      if (this.generation && generation !== generationIndex) return false;
      return !query || humanize(name).toLowerCase().includes(query);
    });
  }

  #pageLink(label, page, rel) {
    return html`<a
      href=${filtersQuery({ ...this.#filters, page }) || '/'}
      rel=${rel}
      @click=${(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        this.#navigate({ page });
        window.scrollTo(0, 0);
      }}
      >${label}</a
    >`;
  }

  render() {
    const { types, generations } = this.index;
    const matches = this.#matches();
    const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const page = Math.min(this.page, pageCount);
    const cards = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(([id, name, , ...typeIndexes]) => ({
      id,
      name,
      types: typeIndexes.map((i) => types[i]),
    }));

    return html`
      <div class="filters">
        <div class="field field--search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            autocomplete="off"
            value=${this.q}
            .value=${live(this.q)}
            @input=${(e) => this.#navigate({ q: e.target.value, page: 1 }, { push: false })}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" .value=${live(this.type)} @change=${(e) => this.#navigate({ type: e.target.value, page: 1 })}>
            <option value="" ?selected=${!this.type}>All types</option>
            ${types.map((t) => html`<option value=${t.name} ?selected=${t.name === this.type}>${t.label}</option>`)}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select
            id="generation"
            .value=${live(this.generation)}
            @change=${(e) => this.#navigate({ generation: e.target.value, page: 1 })}
          >
            <option value="" ?selected=${!this.generation}>All generations</option>
            ${generations.map(
              (g) => html`<option value=${g.name} ?selected=${g.name === this.generation}>${g.label}</option>`,
            )}
          </select>
        </div>
      </div>

      ${countLabel(matches.length)}
      ${matches.length
        ? html`
            ${cardList(cards, this.apiBase)}
            <nav class="pagination" aria-label="Pagination">
              ${page > 1 ? this.#pageLink('Previous page', page - 1, 'prev') : nothing}
              <span>Page ${page} of ${pageCount}</span>
              ${page < pageCount ? this.#pageLink('Next page', page + 1, 'next') : nothing}
            </nav>
          `
        : html`<p class="empty">No Pokémon found</p>`}
    `;
  }
}

customElements.define('pokemon-browser', PokemonBrowser);
