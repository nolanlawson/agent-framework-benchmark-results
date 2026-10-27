import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { PokemonCards } from '../components/PokemonCards'
import { pageTitle } from '../lib/format'
import { fetchPokemonList } from '../server/functions'

type HomeSearch = { q?: string; type?: string; generation?: string; page?: number }

const SEARCH_DEBOUNCE_MS = 150

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): HomeSearch => {
    const str = (v: unknown) => (typeof v === 'string' && v !== '' ? v : typeof v === 'number' ? String(v) : undefined)
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
  head: () => ({ meta: [{ title: pageTitle() }] }),
  component: Home,
})

function Home() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/' })

  const update = (changes: Partial<HomeSearch>, replace = false) =>
    navigate({
      search: (prev) => {
        const next = { ...prev, ...changes, page: undefined }
        for (const key of Object.keys(next) as (keyof HomeSearch)[]) if (!next[key]) delete next[key]
        return next
      },
      replace,
      resetScroll: false,
    })

  return (
    <>
      <h1>Pokémon</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <SearchInput value={search.q ?? ''} onChange={(q) => update({ q }, true)} />
        <div className="field">
          <label htmlFor="filter-type">Type</label>
          <select id="filter-type" value={search.type ?? ''} onChange={(e) => update({ type: e.target.value })}>
            <option value="">All types</option>
            {data.typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="filter-generation">Generation</label>
          <select
            id="filter-generation"
            value={search.generation ?? ''}
            onChange={(e) => update({ generation: e.target.value })}
          >
            <option value="">All generations</option>
            {data.generationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {data.total === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <p className="count">{data.total} Pokémon</p>
          <PokemonCards pokemon={data.items} />
          <nav className="pagination" aria-label="Pagination">
            {data.page > 1 && (
              <Link
                from="/"
                search={(prev) => ({ ...prev, page: data.page - 1 > 1 ? data.page - 1 : undefined })}
              >
                Previous page
              </Link>
            )}
            <span>
              Page {data.page} of {data.pages}
            </span>
            {data.page < data.pages && (
              <Link from="/" search={(prev) => ({ ...prev, page: data.page + 1 })}>
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  )
}

/** Search box that updates the URL as the user types (debounced). */
function SearchInput({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const [text, setText] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Follow URL changes made elsewhere (back/forward), but never while the user is typing.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setText(value)
  }, [value])

  useEffect(() => () => clearTimeout(timer.current), [])

  return (
    <div className="field field-search">
      <label htmlFor="filter-search">Search</label>
      <input
        ref={inputRef}
        id="filter-search"
        type="search"
        value={text}
        autoComplete="off"
        onChange={(e) => {
          const q = e.target.value
          setText(q)
          clearTimeout(timer.current)
          timer.current = setTimeout(() => onChange(q.trim() ? q : ''), SEARCH_DEBOUNCE_MS)
        }}
      />
    </div>
  )
}
