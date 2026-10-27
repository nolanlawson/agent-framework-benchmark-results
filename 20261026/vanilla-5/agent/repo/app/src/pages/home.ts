import { allGenerations, allTypes, speciesList } from '../api';
import { cardList, count, typeBadges, type Page } from '../components';
import { h, replaceChildren } from '../dom';
import { englishName, humanize } from '../format';
import { updateUrl } from '../url-state';

const PAGE_SIZE = 48;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function readFilters(params: URLSearchParams): Filters {
  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

function filtersQuery(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.type) params.set('type', filters.type);
  if (filters.generation) params.set('generation', filters.generation);
  if (filters.page > 1) params.set('page', String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export async function homePage(url: URL): Promise<Page> {
  const [species, types, generations] = await Promise.all([speciesList(), allTypes(), allGenerations()]);

  const typeLabels = new Map(types.map((t) => [t.name, englishName(t)]));
  // Pokémon ID -> its types in slot order, from the type records.
  const pokemonTypes = new Map<number, { slot: number; name: string }[]>();
  for (const type of types) {
    for (const { slot, pokemon } of type.pokemon) {
      const id = Number(pokemon.url.match(/\/(\d+)\/?$/)?.[1]);
      const list = pokemonTypes.get(id) ?? [];
      list.push({ slot, name: type.name });
      pokemonTypes.set(id, list);
    }
  }
  for (const list of pokemonTypes.values()) list.sort((a, b) => a.slot - b.slot);
  const speciesGeneration = new Map<string, string>();
  for (const generation of generations) {
    for (const s of generation.pokemon_species) speciesGeneration.set(s.name, generation.name);
  }

  const filters = readFilters(url.searchParams);
  if (!typeLabels.has(filters.type)) filters.type = '';
  if (!generations.some((g) => g.name === filters.generation)) filters.generation = '';

  const results = h('div', { class: 'results' });

  const renderResults = () => {
    const needle = filters.q.trim().toLowerCase();
    const matches = species.filter(
      (s) =>
        (!needle || humanize(s.name).toLowerCase().includes(needle)) &&
        (!filters.type || pokemonTypes.get(s.id)?.some((t) => t.name === filters.type)) &&
        (!filters.generation || speciesGeneration.get(s.name) === filters.generation),
    );
    if (!matches.length) {
      replaceChildren(results, h('p', { class: 'count empty' }, 'No Pokémon found'));
      return;
    }
    const totalPages = Math.ceil(matches.length / PAGE_SIZE);
    const page = Math.min(filters.page, totalPages);
    const pageItems = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
    const pageLink = (n: number, label: string, rel: string) =>
      h('a', { href: filtersQuery({ ...filters, page: n }), rel }, label);
    replaceChildren(
      results,
      count(matches.length),
      cardList(
        pageItems.map((s) => ({
          id: s.id,
          name: s.name,
          extra: typeBadges(
            (pokemonTypes.get(s.id) ?? []).map((t) => ({ name: t.name, label: typeLabels.get(t.name) ?? humanize(t.name) })),
            false,
          ),
        })),
      ),
      h(
        'nav',
        { class: 'pagination', 'aria-label': 'Pagination' },
        page > 1 && pageLink(page - 1, 'Previous page', 'prev'),
        h('span', null, `Page ${page} of ${totalPages}`),
        page < totalPages && pageLink(page + 1, 'Next page', 'next'),
      ),
    );
  };

  const update = (changes: Partial<Filters>, replace: boolean) => {
    Object.assign(filters, changes, { page: 1 });
    const next = filtersQuery(filters);
    updateUrl(next, replace);
    renderResults();
  };

  let searchTimer: number | undefined;
  const search = h('input', {
    id: 'search',
    type: 'search',
    name: 'q',
    value: filters.q,
    autocomplete: 'off',
    onInput: (event: Event) => {
      const value = (event.target as HTMLInputElement).value;
      clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => update({ q: value }, true), 150);
    },
  });

  const select = (id: string, allLabel: string, options: [value: string, label: string][], selected: string, key: keyof Filters) =>
    h(
      'select',
      { id, name: key, onChange: (event: Event) => update({ [key]: (event.target as HTMLSelectElement).value }, false) },
      h('option', { value: '' }, allLabel),
      options.map(([value, label]) => h('option', { value, selected: value === selected }, label)),
    );

  const controls = h(
    'form',
    { class: 'filters', role: 'search', onSubmit: (event: Event) => event.preventDefault() },
    h('div', { class: 'field field-search' }, h('label', { for: 'search' }, 'Search'), search),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'type-filter' }, 'Type'),
      select('type-filter', 'All types', [...typeLabels], filters.type, 'type'),
    ),
    h(
      'div',
      { class: 'field' },
      h('label', { for: 'generation-filter' }, 'Generation'),
      select(
        'generation-filter',
        'All generations',
        generations.map((g) => [g.name, englishName(g)]),
        filters.generation,
        'generation',
      ),
    ),
  );

  renderResults();
  return { title: '', content: [h('h1', null, 'Pokémon'), controls, results] };
}
