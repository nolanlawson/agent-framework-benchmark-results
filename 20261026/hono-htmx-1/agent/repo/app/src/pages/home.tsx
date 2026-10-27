import type { Context } from 'hono';
import { CardList, Count } from '../components.js';
import { type CardData, generations, humanize, speciesIndex, type TypeInfo, typeIndex } from '../data.js';

const PAGE_SIZE = 48;

type Filters = { q: string; type: string; generation: string; page: number };

function readFilters(c: Context): Filters {
  const page = Number.parseInt(c.req.query('page') ?? '1', 10);
  return {
    q: (c.req.query('q') ?? '').trim(),
    type: c.req.query('type') ?? '',
    generation: c.req.query('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** Canonical URL for a filter state: empty and default values are left out. */
function homeUrl(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q) params.set('q', f.q);
  if (f.type) params.set('type', f.type);
  if (f.generation) params.set('generation', f.generation);
  if (f.page > 1) params.set('page', String(f.page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

async function loadResults(f: Filters) {
  const [{ all }, types, gens] = await Promise.all([speciesIndex(), typeIndex(), generations()]);
  const q = f.q.toLowerCase();
  const gen = gens.find((g) => g.name === f.generation);
  const matches = all.filter((s) => {
    if (q && !humanize(s.name).toLowerCase().includes(q)) return false;
    if (f.type && !types.byPokemon.get(s.id)?.includes(f.type)) return false;
    if (f.generation && !gen?.species.has(s.id)) return false;
    return true;
  });
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(f.page, totalPages);
  const cards: CardData[] = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((s) => ({ ...s, types: types.byPokemon.get(s.id) ?? [] }));
  return { count: matches.length, page, totalPages, cards, types, gens };
}

const Results = ({ f, r }: { f: Filters; r: Awaited<ReturnType<typeof loadResults>> }) => (
  <div id="results">
    {r.count === 0 ? (
      <p class="count">No Pokémon found</p>
    ) : (
      <>
        <Count n={r.count} />
        <CardList cards={r.cards} types={r.types.byName} />
        <nav class="pagination" aria-label="Pagination">
          {r.page > 1 && <a href={homeUrl({ ...f, page: r.page - 1 })}>Previous page</a>}
          <span>
            Page {r.page} of {r.totalPages}
          </span>
          {r.page < r.totalPages && <a href={homeUrl({ ...f, page: r.page + 1 })}>Next page</a>}
        </nav>
      </>
    )}
  </div>
);

const Controls = ({ f, types, gens }: { f: Filters; types: TypeInfo[]; gens: { name: string; label: string }[] }) => (
  <form
    class="filters"
    action="/"
    method="get"
    role="search"
    hx-get="/"
    hx-target="#results"
    hx-swap="outerHTML"
    hx-sync="this:replace"
    hx-push-url="true"
    hx-trigger="input changed delay:250ms from:#search, change from:.filters select, submit"
  >
    <div class="field field--search">
      <label for="search">Search</label>
      <input id="search" type="search" name="q" value={f.q} autocomplete="off" />
    </div>
    <div class="field">
      <label for="type-filter">Type</label>
      <select id="type-filter" name="type">
        <option value="">All types</option>
        {types.map((t) => (
          <option value={t.name} selected={t.name === f.type}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
    <div class="field">
      <label for="generation-filter">Generation</label>
      <select id="generation-filter" name="generation">
        <option value="">All generations</option>
        {gens.map((g) => (
          <option value={g.name} selected={g.name === f.generation}>
            {g.label}
          </option>
        ))}
      </select>
    </div>
    <noscript>
      <button type="submit">Apply</button>
    </noscript>
  </form>
);

export async function homePage(c: Context) {
  const f = readFilters(c);
  const r = await loadResults(f);
  c.header('Vary', 'HX-Request');

  // htmx swaps just the results and pushes the canonical URL.
  if (c.req.header('HX-Request') && !c.req.header('HX-History-Restore-Request')) {
    c.header('HX-Push-Url', homeUrl({ ...f, page: r.page }));
    return c.html(<Results f={f} r={r} />);
  }

  return c.render(
    <>
      <h1>Pokémon</h1>
      <Controls f={f} types={r.types.all} gens={r.gens} />
      <Results f={f} r={r} />
    </>,
    { title: '', scripts: true },
  );
}
