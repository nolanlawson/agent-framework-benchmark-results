import { CardGrid, Count, PokemonCard, TypeBadge } from '../components.js'
import { allTypes, englishName, generations, speciesIndex } from '../data.js'
import { withQuery } from '../util.js'

export const PAGE_SIZE = 48

export type HomeQuery = { q: string; type: string; generation: string; page: number }

export function parseHomeQuery(query: Record<string, string | undefined>): HomeQuery {
  const page = Number.parseInt(query.page ?? '', 10)
  return {
    q: (query.q ?? '').trim(),
    type: query.type ?? '',
    generation: query.generation ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  }
}

export const homeUrl = (q: HomeQuery, page = q.page) =>
  withQuery('/', { q: q.q, type: q.type, generation: q.generation, page: page > 1 ? page : undefined })

export async function Results({ query }: { query: HomeQuery }) {
  const [index, types] = await Promise.all([speciesIndex(), allTypes()])
  const typeLabels = new Map(types.map((t) => [t.name, englishName(t)]))
  const needle = query.q.toLowerCase()
  const matches = index.filter(
    (s) =>
      (!needle || s.label.toLowerCase().includes(needle)) &&
      (!query.type || s.types.includes(query.type)) &&
      (!query.generation || s.generation === query.generation),
  )
  if (!matches.length) return <p class="count">No Pokémon found</p>

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const page = Math.min(query.page, totalPages)
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageLink = (n: number, label: string) => {
    const href = homeUrl(query, n)
    return (
      <a href={href} hx-get={href} hx-target="#results" hx-swap="innerHTML show:window:top">
        {label}
      </a>
    )
  }
  return (
    <>
      <Count n={matches.length} />
      <CardGrid>
        {shown.map((s) => (
          <PokemonCard
            species={s}
            extra={
              <span class="card__types">
                {s.types.map((t) => (
                  <TypeBadge name={t} label={typeLabels.get(t) ?? t} link={false} />
                ))}
              </span>
            }
          />
        ))}
      </CardGrid>
      <nav class="pagination" aria-label="Pagination">
        {page > 1 && pageLink(page - 1, 'Previous page')}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages && pageLink(page + 1, 'Next page')}
      </nav>
    </>
  )
}

export async function HomePage({ query }: { query: HomeQuery }) {
  const [types, gens] = await Promise.all([allTypes(), generations()])
  return (
    <>
      <h1>Pokémon</h1>
      <form
        class="filters"
        action="/"
        method="get"
        role="search"
        hx-get="/"
        hx-target="#results"
        hx-trigger="input delay:250ms, search, submit"
        hx-sync="this:replace"
      >
        <div class="field field--search">
          <label for="q">Search</label>
          <input id="q" name="q" type="search" value={query.q} autocomplete="off" />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type">
            <option value="">All types</option>
            {types.map((t) => (
              <option value={t.name} selected={t.name === query.type}>
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
              <option value={g.name} selected={g.name === query.generation}>
                {englishName(g)}
              </option>
            ))}
          </select>
        </div>
      </form>
      <div id="results">
        <Results query={query} />
      </div>
    </>
  )
}
