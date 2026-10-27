import { useEffect, useId, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { fetchPokemonList } from '../server/functions'
import { CardGrid } from '../components/PokemonCard'

interface ListSearch {
  q?: string
  type?: string
  generation?: string
  page?: number
}

const SEARCH_DEBOUNCE_MS = 200

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): ListSearch => {
    const page = Number(search.page)
    return {
      q: str(search.q),
      type: str(search.type),
      generation: str(search.generation),
      page: Number.isInteger(page) && page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => fetchPokemonList({ data: deps }),
  head: () => ({ meta: [{ title: 'Pokédex' }] }),
  component: PokemonListPage,
})

function PokemonListPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })
  const ids = { q: useId(), type: useId(), generation: useId() }

  const urlQuery = search.q ?? ''
  const [text, setText] = useState(urlQuery)
  const lastQuery = useRef(urlQuery)

  // Follow the URL when it changes from outside the search box (back/forward, links).
  useEffect(() => {
    if (urlQuery !== lastQuery.current) {
      lastQuery.current = urlQuery
      setText(urlQuery)
    }
  }, [urlQuery])

  useEffect(() => {
    if (text === lastQuery.current) return
    const timer = setTimeout(() => {
      lastQuery.current = text
      navigate({ search: (prev) => ({ ...prev, q: text || undefined, page: undefined }), replace: true })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [text, navigate])

  const setFilter = (key: 'type' | 'generation', value: string) => {
    navigate({ search: (prev) => ({ ...prev, [key]: value || undefined, page: undefined }) })
  }

  const pageSearch = (page: number) => ({ ...search, page: page > 1 ? page : undefined })

  return (
    <>
      <h1>Pokémon</h1>
      <form
        className="filters"
        role="search"
        method="get"
        action="/"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="field field-search">
          <label htmlFor={ids.q}>Search</label>
          <input
            id={ids.q}
            type="search"
            name="q"
            value={text}
            autoComplete="off"
            onChange={(event) => setText(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={ids.type}>Type</label>
          <select id={ids.type} name="type" value={search.type ?? ''} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">All types</option>
            {data.typeOptions.map((t) => (
              <option key={t.name} value={t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={ids.generation}>Generation</label>
          <select
            id={ids.generation}
            name="generation"
            value={search.generation ?? ''}
            onChange={(e) => setFilter('generation', e.target.value)}
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

      {data.count === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <p className="count">{data.count} Pokémon</p>
          <CardGrid cards={data.cards} />
          <nav className="pagination" aria-label="Pagination">
            {data.page > 1 && (
              <Link to="/" search={pageSearch(data.page - 1)}>
                Previous page
              </Link>
            )}
            <span>
              Page {data.page} of {data.totalPages}
            </span>
            {data.page < data.totalPages && (
              <Link to="/" search={pageSearch(data.page + 1)}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  )
}
