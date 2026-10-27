import { allGenerations, allTypes, englishName, idFromUrl, isAlternateForm, speciesIndex, type SpeciesSummary } from '../api';
import { cardList, countText, pokemonCard, typeBadge } from '../components';
import { h } from '../dom';
import { updateUrl } from '../nav';

const PAGE_SIZE = 48;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function readFilters(url: URL): Filters {
  const page = parseInt(url.searchParams.get('page') ?? '1', 10);
  return {
    q: url.searchParams.get('q') ?? '',
    type: url.searchParams.get('type') ?? '',
    generation: url.searchParams.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function filtersUrl(f: Filters): URL {
  const url = new URL('/', location.href);
  if (f.q) url.searchParams.set('q', f.q);
  if (f.type) url.searchParams.set('type', f.type);
  if (f.generation) url.searchParams.set('generation', f.generation);
  if (f.page > 1) url.searchParams.set('page', String(f.page));
  return url;
}

export async function homePage(_params: string[], url: URL): Promise<Node> {
  const [species, types, generations] = await Promise.all([speciesIndex(), allTypes(), allGenerations()]);

  // Default Pokémon ID (== species ID) -> its types, in slot order.
  const typesById = new Map<number, { slot: number; name: string; label: string }[]>();
  for (const t of types) {
    const label = englishName(t);
    for (const p of t.pokemon) {
      if (isAlternateForm(p.pokemon)) continue;
      const id = idFromUrl(p.pokemon.url);
      const list = typesById.get(id) ?? [];
      list.push({ slot: p.slot, name: t.name, label });
      typesById.set(id, list);
    }
  }
  for (const list of typesById.values()) list.sort((a, b) => a.slot - b.slot);

  const generationById = new Map<number, string>();
  for (const g of generations) for (const s of g.pokemon_species) generationById.set(idFromUrl(s.url), g.name);

  const all = [...species.values()].sort((a, b) => a.id - b.id);
  let filters = readFilters(url);

  const search = h('input', { type: 'search', id: 'search', name: 'q', autocomplete: 'off' });
  search.value = filters.q;
  const typeSelect = h(
    'select',
    { id: 'type', name: 'type' },
    h('option', { value: '' }, 'All types'),
    types.map((t) => h('option', { value: t.name }, englishName(t))),
  );
  typeSelect.value = filters.type;
  const genSelect = h(
    'select',
    { id: 'generation', name: 'generation' },
    h('option', { value: '' }, 'All generations'),
    generations.map((g) => h('option', { value: g.name }, englishName(g))),
  );
  genSelect.value = filters.generation;

  const results = h('div', { class: 'results' });

  function card(s: SpeciesSummary) {
    const ts = typesById.get(s.id) ?? [];
    return pokemonCard(s, h('span', { class: 'types' }, ts.map((t) => typeBadge(t.name, t.label, false))));
  }

  function renderResults() {
    const q = filters.q.trim().toLowerCase();
    const matches = all.filter(
      (s) =>
        (!q || s.label.toLowerCase().includes(q)) &&
        (!filters.type || typesById.get(s.id)?.some((t) => t.name === filters.type)) &&
        (!filters.generation || generationById.get(s.id) === filters.generation),
    );
    if (!matches.length) {
      results.replaceChildren(h('p', { class: 'count' }, 'No Pokémon found'));
      return;
    }
    const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
    const page = Math.min(filters.page, totalPages);
    const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    results.replaceChildren(
      countText(matches.length),
      cardList(shown.map(card)),
      h(
        'nav',
        { class: 'pagination', 'aria-label': 'Pagination' },
        page > 1 && h('a', { href: filtersUrl({ ...filters, page: page - 1 }).href, rel: 'prev' }, 'Previous page'),
        h('span', null, `Page ${page} of ${totalPages}`),
        page < totalPages && h('a', { href: filtersUrl({ ...filters, page: page + 1 }).href, rel: 'next' }, 'Next page'),
      ),
    );
  }

  let debounce: number | undefined;
  function onFilterChange(immediate: boolean) {
    clearTimeout(debounce);
    const apply = () => {
      const next = { q: search.value, type: typeSelect.value, generation: genSelect.value, page: 1 };
      if (next.q === filters.q && next.type === filters.type && next.generation === filters.generation) return;
      filters = next;
      updateUrl(filtersUrl(filters), true);
      renderResults();
    };
    if (immediate) apply();
    else debounce = window.setTimeout(apply, 150);
  }
  search.addEventListener('input', () => onFilterChange(false));
  search.addEventListener('search', () => onFilterChange(true));
  typeSelect.addEventListener('change', () => onFilterChange(true));
  genSelect.addEventListener('change', () => onFilterChange(true));

  renderResults();

  return h(
    'div',
    null,
    h('h1', null, 'Pokémon'),
    h(
      'form',
      { class: 'filters', role: 'search', onsubmit: ((e: Event) => e.preventDefault()) as EventListener },
      h('div', { class: 'field field-search' }, h('label', { for: 'search' }, 'Search'), search),
      h('div', { class: 'field' }, h('label', { for: 'type' }, 'Type'), typeSelect),
      h('div', { class: 'field' }, h('label', { for: 'generation' }, 'Generation'), genSelect),
    ),
    results,
  );
}
