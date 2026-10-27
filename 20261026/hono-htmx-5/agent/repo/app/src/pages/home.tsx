import { englishName, generations, humanize, mainTypes, speciesIndex } from '../api';
import { Card, CardList, Layout } from '../components';

const PER_PAGE = 48;

export type Filters = { q: string; type: string; generation: string; page: number };

export function parseFilters(query: Record<string, string | undefined>): Filters {
  const page = Number.parseInt(query.page ?? '', 10);
  return {
    q: (query.q ?? '').trim(),
    type: query.type ?? '',
    generation: query.generation ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** The canonical URL for a filter state: empty and default values left out. */
export function homeUrl(f: Partial<Filters>) {
  const params = new URLSearchParams();
  if (f.q) params.set('q', f.q);
  if (f.type) params.set('type', f.type);
  if (f.generation) params.set('generation', f.generation);
  if (f.page && f.page > 1) params.set('page', String(f.page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export async function loadResults(f: Filters) {
  const index = await speciesIndex();
  const q = f.q.toLowerCase();
  const matches = index.filter(
    (s) =>
      (!q || humanize(s.name).toLowerCase().includes(q)) &&
      (!f.type || s.types.some((t) => t.name === f.type)) &&
      (!f.generation || s.generation === f.generation),
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / PER_PAGE));
  const page = Math.min(f.page, totalPages);
  return {
    filters: { ...f, page },
    count: matches.length,
    totalPages,
    items: matches.slice((page - 1) * PER_PAGE, page * PER_PAGE),
  };
}

type Results = Awaited<ReturnType<typeof loadResults>>;

export const ResultsView = ({ results }: { results: Results }) => {
  const { filters, count, totalPages, items } = results;
  return (
    <div id="results" aria-live="polite">
      {count === 0 ? (
        <p class="count">No Pokémon found</p>
      ) : (
        <>
          <p class="count">{count} Pokémon</p>
          <CardList>
            {items.map((s) => (
              <Card id={s.id} name={s.name} types={s.types} />
            ))}
          </CardList>
          <nav class="pagination" aria-label="Pagination">
            {filters.page > 1 && <a href={homeUrl({ ...filters, page: filters.page - 1 })}>Previous page</a>}
            <span>
              Page {filters.page} of {totalPages}
            </span>
            {filters.page < totalPages && <a href={homeUrl({ ...filters, page: filters.page + 1 })}>Next page</a>}
          </nav>
        </>
      )}
    </div>
  );
};

export async function HomePage({ filters }: { filters: Filters }) {
  const [results, types, gens] = await Promise.all([loadResults(filters), mainTypes(), generations()]);
  return (
    <Layout>
      <h1>Pokémon</h1>
      <form
        class="filters"
        action="/"
        method="get"
        role="search"
        hx-get="/"
        hx-trigger="input delay:200ms, change, submit"
        hx-target="#results"
        hx-swap="outerHTML"
        hx-sync="this:replace"
      >
        <div class="field field-search">
          <label for="q">Search</label>
          <input id="q" name="q" type="search" value={filters.q} autocomplete="off" />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type">
            <option value="">All types</option>
            {types.map((t) => (
              <option value={t.name} selected={t.name === filters.type}>
                {englishName(t)}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation">
            <option value="">All generations</option>
            {gens.map((g) => (
              <option value={g.name} selected={g.name === filters.generation}>
                {englishName(g)}
              </option>
            ))}
          </select>
        </div>
        <noscript>
          <button type="submit">Apply</button>
        </noscript>
      </form>
      <ResultsView results={results} />
    </Layout>
  );
}
