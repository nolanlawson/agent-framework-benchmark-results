import { useEffect, useRef, useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { CardList, Count } from '../components/ui'
import { getPokemonList, type ListFilters } from '../lib/pokedex.functions'

const SEARCH_DEBOUNCE_MS = 150

// Only keep parameters that are set and not at their default.
function cleanFilters(input: Record<string, unknown>): ListFilters {
  const out: ListFilters = {}
  const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')
  const q = str(input.q)
  if (q.trim()) out.q = q
  const type = str(input.type)
  if (type) out.type = type
  const generation = str(input.generation)
  if (generation) out.generation = generation
  const page = Math.floor(Number(input.page))
  if (Number.isFinite(page) && page > 1) out.page = page
  return out
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => cleanFilters(search),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPokemonList({ data: deps }),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const setFilters = (patch: Partial<ListFilters>, replace = false) =>
    navigate({ search: (prev) => cleanFilters({ ...prev, ...patch, page: undefined }), replace, resetScroll: false })

  // The search box keeps its own state so typing stays responsive; the URL follows after a short pause.
  const [query, setQuery] = useState(search.q ?? '')
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => {
    if (document.activeElement !== input.current) setQuery(search.q ?? '')
  }, [search.q])
  useEffect(() => () => clearTimeout(timer.current), [])

  const onQuery = (value: string) => {
    setQuery(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setFilters({ q: value }, true), SEARCH_DEBOUNCE_MS)
  }

  return (
    <>
      <h1>Pokémon</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            ref={input}
            type="search"
            value={query}
            autoComplete="off"
            onChange={(e) => onQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={search.type ?? ''} onChange={(e) => setFilters({ type: e.target.value })}>
            <option value="">All types</option>
            {data.typeOptions.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation">Generation</label>
          <select
            id="generation"
            value={search.generation ?? ''}
            onChange={(e) => setFilters({ generation: e.target.value })}
          >
            <option value="">All generations</option>
            {data.generationOptions.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {data.total === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <Count n={data.total} />
          <CardList cards={data.items} />
          <nav className="pagination" aria-label="Pagination">
            {data.page > 1 && (
              <Link to="/" search={cleanFilters({ ...search, page: data.page - 1 })}>
                Previous page
              </Link>
            )}
            <span>
              Page {data.page} of {data.pageCount}
            </span>
            {data.page < data.pageCount && (
              <Link to="/" search={cleanFilters({ ...search, page: data.page + 1 })}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  )
}
