import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { PokemonCards } from '../components/PokemonCards'
import { fetchHome } from '../lib/api'

type HomeSearch = { q?: string; type?: string; generation?: string; page?: number }

const text = (value: unknown) => (value === undefined || value === null || value === '' ? undefined : String(value))

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const page = Number(search.page)
    return {
      q: text(search.q),
      type: text(search.type),
      generation: text(search.generation),
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => fetchHome({ data: deps }),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: Home,
})

const SEARCH_DEBOUNCE_MS = 200

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const setFilters = (changes: Partial<HomeSearch>, replace = false) =>
    navigate({ search: (prev) => ({ ...prev, ...changes, page: undefined }), replace })

  // The search box updates the URL as the user types, debounced.
  const [query, setQuery] = useState(search.q ?? '')
  const pushedQuery = useRef(search.q ?? '')
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if ((search.q ?? '') !== pushedQuery.current) {
      pushedQuery.current = search.q ?? ''
      setQuery(search.q ?? '')
    }
  }, [search.q])
  useEffect(() => () => clearTimeout(timer.current), [])

  const onQueryChange = (value: string) => {
    setQuery(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      pushedQuery.current = value
      setFilters({ q: value || undefined }, true)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <>
      <h1>Pokémon</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-search">
          <label htmlFor="filter-q">Search</label>
          <input
            id="filter-q"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-type">Type</label>
          <select
            id="filter-type"
            value={search.type ?? ''}
            onChange={(e) => setFilters({ type: e.target.value || undefined })}
          >
            <option value="">All types</option>
            {data.types.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-generation">Generation</label>
          <select
            id="filter-generation"
            value={search.generation ?? ''}
            onChange={(e) => setFilters({ generation: e.target.value || undefined })}
          >
            <option value="">All generations</option>
            {data.generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {data.count === 0 ? (
        <p className="muted count">No Pokémon found</p>
      ) : (
        <>
          <p className="muted count">{data.count} Pokémon</p>
          <PokemonCards cards={data.items} />
        </>
      )}

      <nav className="pagination" aria-label="Pagination">
        <span>
          Page {data.page} of {data.totalPages}
        </span>
        {data.page > 1 && (
          <Link to="/" search={(prev) => ({ ...prev, page: data.page - 1 > 1 ? data.page - 1 : undefined })}>
            Previous page
          </Link>
        )}
        {data.page < data.totalPages && (
          <Link to="/" search={(prev) => ({ ...prev, page: data.page + 1 })}>
            Next page
          </Link>
        )}
      </nav>
    </>
  )
}
