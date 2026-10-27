import type { FC } from 'hono/jsx';
import { getDex, getGenerations, getTypes, englishName, type DexEntry } from '../api.js';
import { CardList, TypeBadge } from '../components.js';

export const PAGE_SIZE = 48;

export type HomeQuery = { q: string; type: string; generation: string; page: number };

export function parseHomeQuery(params: URLSearchParams): HomeQuery {
  const page = parseInt(params.get('page') ?? '1', 10);
  return {
    q: (params.get('q') ?? '').trim(),
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Canonical URL for a filter state: empty and default parameters are left out. */
export function homeUrl(q: HomeQuery, page = q.page): string {
  const params = new URLSearchParams();
  if (q.q) params.set('q', q.q);
  if (q.type) params.set('type', q.type);
  if (q.generation) params.set('generation', q.generation);
  if (page > 1) params.set('page', String(page));
  const s = params.toString();
  return s ? `/?${s}` : '/';
}

export type ResultsData = {
  query: HomeQuery;
  total: number;
  pages: number;
  page: number;
  items: DexEntry[];
  typeLabels: Map<string, string>;
};

export async function loadResults(query: HomeQuery): Promise<ResultsData> {
  const [dex, types] = await Promise.all([getDex(), getTypes()]);
  const needle = query.q.toLowerCase();
  const matches = dex.filter(
    (p) =>
      (!needle || p.label.toLowerCase().includes(needle)) &&
      (!query.type || p.types.includes(query.type)) &&
      (!query.generation || p.generation === query.generation),
  );
  const pages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(query.page, pages);
  return {
    query,
    total: matches.length,
    pages,
    page,
    items: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    typeLabels: new Map(types.map((t) => [t.name, t.label])),
  };
}

export const Results: FC<{ data: ResultsData }> = ({ data }) => (
  <div id="results" aria-live="polite">
    {data.total === 0 ? (
      <p class="count">No Pokémon found</p>
    ) : (
      <>
        <p class="count">{data.total} Pokémon</p>
        <CardList
          items={data.items}
          extra={(_, i) => (
            <span class="card__types">
              {data.items[i].types.map((t) => (
                <TypeBadge name={t} label={data.typeLabels.get(t) ?? t} link={false} />
              ))}
            </span>
          )}
        />
        <nav class="pagination" aria-label="Pagination">
          {data.page > 1 && <a href={homeUrl(data.query, data.page - 1)}>Previous page</a>}
          <span>
            Page {data.page} of {data.pages}
          </span>
          {data.page < data.pages && <a href={homeUrl(data.query, data.page + 1)}>Next page</a>}
        </nav>
      </>
    )}
  </div>
);

export const HomePage: FC<{ data: ResultsData }> = async ({ data }) => {
  const [types, generations] = await Promise.all([getTypes(), getGenerations()]);
  const q = data.query;
  return (
    <>
      <h1>Pokémon</h1>
      <form
        class="filters"
        method="get"
        action="/"
        role="search"
        hx-get="/"
        hx-trigger="submit, input changed delay:200ms from:#search, change"
        hx-target="#results"
        hx-swap="outerHTML"
        hx-sync="this:replace"
      >
        <div class="field field--search">
          <label for="search">Search</label>
          <input id="search" type="search" name="q" value={q.q} autocomplete="off" />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type">
            <option value="">All types</option>
            {types.map((t) => (
              <option value={t.name} selected={q.type === t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation">
            <option value="">All generations</option>
            {generations.map((g) => (
              <option value={g.name} selected={q.generation === g.name}>
                {englishName(g)}
              </option>
            ))}
          </select>
        </div>
        <noscript>
          <button type="submit">Apply</button>
        </noscript>
      </form>
      <Results data={data} />
    </>
  );
};
