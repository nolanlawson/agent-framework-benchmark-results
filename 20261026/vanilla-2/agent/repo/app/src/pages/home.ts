import { englishName, getGenerations, getMainTypes, getSpeciesNames, humanize, idFromUrl } from '../api';
import { cardList, typeBadge } from '../components';
import { html } from '../html';
import { updateUrl, type Page, type PageContext } from '../router';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 150;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function readFilters(url: URL): Filters {
  const params = url.searchParams;
  const page = Number.parseInt(params.get('page') ?? '', 10);
  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function filtersHref(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

interface Entry {
  id: number;
  name: string;
  label: string; // humanized name, lowercased for search
  types: string[];
  generation?: string;
}

export async function homePage({ url }: PageContext): Promise<Page> {
  const [speciesNames, types, generations] = await Promise.all([getSpeciesNames(), getMainTypes(), getGenerations()]);

  // Default Pokémon share the species ID, so type slots can be keyed by species ID.
  const typeSlots = new Map<number, { slot: number; type: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!speciesNames.has(id)) continue;
      const slots = typeSlots.get(id) ?? [];
      slots.push({ slot, type: type.name });
      typeSlots.set(id, slots);
    }
  }
  const generationOf = new Map<number, string>();
  for (const generation of generations) {
    for (const species of generation.pokemon_species) generationOf.set(idFromUrl(species.url), generation.name);
  }
  const typeNames = new Map(types.map((t) => [t.name, englishName(t)]));

  const entries: Entry[] = [...speciesNames]
    .sort(([a], [b]) => a - b)
    .map(([id, name]) => ({
      id,
      name,
      label: humanize(name).toLowerCase(),
      types: (typeSlots.get(id) ?? []).sort((a, b) => a.slot - b.slot).map((s) => s.type),
      generation: generationOf.get(id),
    }));

  const filters = readFilters(url);

  const results = (f: Filters) => {
    const q = f.q.trim().toLowerCase();
    const matches = entries.filter(
      (e) =>
        (!q || e.label.includes(q)) &&
        (!f.type || e.types.includes(f.type)) &&
        (!f.generation || e.generation === f.generation),
    );
    if (!matches.length) return html`<p class="count">No Pokémon found</p>`;
    const totalPages = Math.ceil(matches.length / PAGE_SIZE);
    const page = Math.min(f.page, totalPages);
    const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    return html`<p class="count">${matches.length} Pokémon</p>
      ${cardList(
        shown.map((e) => ({
          id: e.id,
          name: e.name,
          extra: html`<span class="badges">${e.types.map((t) => typeBadge(t, typeNames.get(t) ?? humanize(t), false))}</span>`,
        })),
      )}
      <nav class="pagination" aria-label="Pagination">
        ${page > 1 && html`<a href="${filtersHref({ ...f, page: page - 1 })}" rel="prev">Previous page</a>`}
        <span>Page ${page} of ${totalPages}</span>
        ${page < totalPages && html`<a href="${filtersHref({ ...f, page: page + 1 })}" rel="next">Next page</a>`}
      </nav>`;
  };

  const option = (value: string, label: string, selected: string) =>
    html`<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`;

  return {
    title: 'Pokémon',
    documentTitle: null,
    body: html`<h1>Pokémon</h1>
      <form class="filters" role="search" action="/">
        <div class="field field--search">
          <label for="filter-q">Search</label>
          <input id="filter-q" name="q" type="search" value="${filters.q}" autocomplete="off" />
        </div>
        <div class="field">
          <label for="filter-type">Type</label>
          <select id="filter-type" name="type">
            ${option('', 'All types', filters.type)}
            ${types.map((t) => option(t.name, englishName(t), filters.type))}
          </select>
        </div>
        <div class="field">
          <label for="filter-generation">Generation</label>
          <select id="filter-generation" name="generation">
            ${option('', 'All generations', filters.generation)}
            ${generations.map((g) => option(g.name, englishName(g), filters.generation))}
          </select>
        </div>
      </form>
      <div id="results">${results(filters)}</div>`,
    mount(main) {
      const form = main.querySelector<HTMLFormElement>('.filters')!;
      const resultsEl = main.querySelector<HTMLElement>('#results')!;
      const current = (): Filters => ({
        q: (form.elements.namedItem('q') as HTMLInputElement).value,
        type: (form.elements.namedItem('type') as HTMLSelectElement).value,
        generation: (form.elements.namedItem('generation') as HTMLSelectElement).value,
        page: 1,
      });
      const apply = (replace: boolean) => {
        if (!form.isConnected) return; // The user navigated away meanwhile.
        const f = current();
        updateUrl(filtersHref(f), { replace });
        resultsEl.innerHTML = results(f).value;
      };
      let timer: number | undefined;
      form.addEventListener('input', (event) => {
        if ((event.target as HTMLElement).id !== 'filter-q') return;
        clearTimeout(timer);
        timer = window.setTimeout(() => apply(true), SEARCH_DEBOUNCE_MS);
      });
      form.addEventListener('change', (event) => {
        if ((event.target as HTMLElement).tagName !== 'SELECT') return;
        clearTimeout(timer);
        apply(false);
      });
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        clearTimeout(timer);
        apply(true);
      });
    },
  };
}
