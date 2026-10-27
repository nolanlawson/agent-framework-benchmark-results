import {
  englishName,
  getAll,
  getTypes,
  get,
  humanize,
  idFromUrl,
  isDefaultForm,
  type Generation,
} from '../api';
import { cardGrid, countLine, pageTitle, type CardData } from '../components';
import { h } from '../dom';
import type { RouteContext, View } from '../router';

const PAGE_SIZE = 48;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

interface Entry {
  id: number;
  name: string;
  humanName: string;
  types: string[];
  generation?: string;
}

function readFilters(url: URL): Filters {
  const page = Number.parseInt(url.searchParams.get('page') ?? '1', 10);
  return {
    q: url.searchParams.get('q') ?? '',
    type: url.searchParams.get('type') ?? '',
    generation: url.searchParams.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function filtersQuery(filters: Filters, page = filters.page): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

async function loadEntries() {
  const [species, types, generationRefs] = await Promise.all([
    getAll('pokemon-species'),
    getTypes(),
    getAll('generation'),
  ]);
  const generations = await Promise.all(generationRefs.map((g) => get<Generation>(g.url)));

  const entries = new Map<number, Entry>();
  for (const s of species) {
    const id = idFromUrl(s.url);
    entries.set(id, { id, name: s.name, humanName: humanize(s.name), types: [] });
  }
  // Types of each species' default Pokémon (same ID as the species), in slot order.
  const slots = new Map<number, { slot: number; type: string }[]>();
  for (const type of types) {
    for (const p of type.pokemon) {
      const id = idFromUrl(p.pokemon.url);
      if (!isDefaultForm(id)) continue;
      if (!slots.has(id)) slots.set(id, []);
      slots.get(id)!.push({ slot: p.slot, type: type.name });
    }
  }
  for (const [id, list] of slots) {
    const entry = entries.get(id);
    if (entry) entry.types = list.sort((a, b) => a.slot - b.slot).map((s) => s.type);
  }
  for (const gen of generations) {
    for (const s of gen.pokemon_species) {
      const entry = entries.get(idFromUrl(s.url));
      if (entry) entry.generation = gen.name;
    }
  }
  return {
    entries: [...entries.values()].sort((a, b) => a.id - b.id),
    typeNames: new Map(types.map((t) => [t.name, englishName(t)])),
    generations: generations.sort((a, b) => a.id - b.id).map((g) => ({ name: g.name, label: englishName(g) })),
  };
}

export async function homePage({ url }: RouteContext): Promise<View> {
  const { entries, typeNames, generations } = await loadEntries();
  let filters = readFilters(url);

  const field = (label: string, id: string, control: HTMLElement, extraClass = '') =>
    h('div', { class: `field ${extraClass}`.trim() }, h('label', { for: id, class: 'field__label' }, label), control);

  const search = h('input', {
    type: 'search',
    id: 'filter-q',
    class: 'input',
    name: 'q',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  search.value = filters.q;

  const typeSelect = h(
    'select',
    { id: 'filter-type', class: 'input', name: 'type' },
    h('option', { value: '' }, 'All types'),
    [...typeNames].map(([name, label]) => h('option', { value: name }, label)),
  );
  typeSelect.value = typeNames.has(filters.type) ? filters.type : '';

  const generationSelect = h(
    'select',
    { id: 'filter-generation', class: 'input', name: 'generation' },
    h('option', { value: '' }, 'All generations'),
    generations.map((g) => h('option', { value: g.name }, g.label)),
  );
  generationSelect.value = generations.some((g) => g.name === filters.generation) ? filters.generation : '';

  const results = h('div', { class: 'results' });

  const renderResults = () => {
    const q = filters.q.trim().toLowerCase();
    const matches = entries.filter(
      (e) =>
        (!q || e.humanName.toLowerCase().includes(q)) &&
        (!filters.type || e.types.includes(filters.type)) &&
        (!filters.generation || e.generation === filters.generation),
    );
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const page = Math.min(filters.page, totalPages);
    const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const cards: CardData[] = shown.map((e) => ({ id: e.id, speciesName: e.name, types: e.types }));

    if (!matches.length) {
      results.replaceChildren(h('p', { class: 'empty' }, 'No Pokémon found'));
      return;
    }
    results.replaceChildren(
      countLine(matches.length),
      cardGrid(cards, typeNames),
      h(
        'nav',
        { class: 'pagination', 'aria-label': 'Pagination' },
        page > 1 ? h('a', { href: filtersQuery(filters, page - 1), rel: 'prev' }, 'Previous page') : null,
        h('span', { class: 'pagination__status' }, `Page ${page} of ${totalPages}`),
        page < totalPages ? h('a', { href: filtersQuery(filters, page + 1), rel: 'next' }, 'Next page') : null,
      ),
    );
  };

  const update = (changes: Partial<Filters>, replace: boolean) => {
    filters = { ...filters, ...changes, page: 1 };
    const next = filtersQuery(filters);
    if (replace) history.replaceState(null, '', next);
    else history.pushState(null, '', next);
    renderResults();
  };

  let searchTimer: number | undefined;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => update({ q: search.value }, true), 150);
  });
  search.addEventListener('search', () => {
    clearTimeout(searchTimer);
    update({ q: search.value }, true);
  });
  typeSelect.addEventListener('change', () => update({ type: typeSelect.value }, false));
  generationSelect.addEventListener('change', () => update({ generation: generationSelect.value }, false));

  renderResults();

  return {
    title: 'Pokémon',
    documentTitle: 'Pokédex',
    node: h(
      'div',
      { class: 'stack' },
      pageTitle('Pokémon'),
      h(
        'form',
        { class: 'filters', role: 'search', onsubmit: (e: Event) => e.preventDefault() },
        field('Search', 'filter-q', search, 'field--search'),
        field('Type', 'filter-type', typeSelect),
        field('Generation', 'filter-generation', generationSelect),
      ),
      results,
    ),
  };
}
