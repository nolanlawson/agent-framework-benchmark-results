'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { PokemonCard } from '@/components/PokemonCard';
import { humanize } from '@/lib/format';

/** [species id, species name, type names in slot order, generation name] */
export type IndexEntry = [number, string, string[], string];
type Option = { name: string; label: string };

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 150;

type Filters = { q: string; type: string; generation: string; page: number };

function readFilters(params: URLSearchParams): Filters {
  const page = parseInt(params.get('page') ?? '1', 10);
  return {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    generation: params.get('generation') ?? '',
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function toQuery(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.type) params.set('type', f.type);
  if (f.generation) params.set('generation', f.generation);
  if (f.page > 1) params.set('page', String(f.page));
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

export function HomeView({
  entries,
  types,
  generations,
  apiBase,
}: {
  entries: IndexEntry[];
  types: Option[];
  generations: Option[];
  apiBase: string;
}) {
  const searchParams = useSearchParams();
  const filters = readFilters(new URLSearchParams(searchParams.toString()));
  const typeLabels = useMemo(() => new Map(types.map((t) => [t.name, t.label])), [types]);

  // The search box filters immediately; the URL catches up after a short pause.
  const [query, setQuery] = useState(filters.q);
  const lastWritten = useRef(filters.q);
  useEffect(() => {
    if (filters.q !== lastWritten.current) {
      lastWritten.current = filters.q;
      setQuery(filters.q);
    }
  }, [filters.q]);
  useEffect(() => {
    if (query.trim() === filters.q.trim()) return;
    const timer = setTimeout(() => {
      lastWritten.current = query.trim();
      window.history.replaceState(null, '', toQuery({ ...filters, q: query, page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  });

  const humanized = useMemo(() => entries.map((e) => humanize(e[1]).toLowerCase()), [entries]);
  const needle = query.trim().toLowerCase();
  const matches = entries.filter(
    (e, i) =>
      (!needle || humanized[i].includes(needle)) &&
      (!filters.type || e[2].includes(filters.type)) &&
      (!filters.generation || e[3] === filters.generation),
  );

  const pageCount = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const searching = needle !== filters.q.trim().toLowerCase();
  const page = searching ? 1 : Math.min(filters.page, pageCount);
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current: Filters = { ...filters, q: query, page };

  const navigate = (next: Filters) => {
    lastWritten.current = next.q.trim();
    window.history.pushState(null, '', toQuery(next));
  };

  const goToPage = (event: React.MouseEvent<HTMLAnchorElement>, n: number) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate({ ...current, page: n });
    window.scrollTo(0, 0);
  };

  return (
    <>
      <h1>Pokémon</h1>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={filters.type}
            onChange={(e) => navigate({ ...current, type: e.target.value, page: 1 })}
          >
            <option value="">All types</option>
            {types.map((t) => (
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
            value={filters.generation}
            onChange={(e) => navigate({ ...current, generation: e.target.value, page: 1 })}
          >
            <option value="">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p className="count" aria-live="polite">
        {matches.length} Pokémon
      </p>

      {matches.length === 0 ? (
        <p className="empty">No Pokémon found</p>
      ) : (
        <>
          <ul className="cards">
            {shown.map(([id, name, typeNames]) => (
              <PokemonCard
                key={id}
                apiBase={apiBase}
                card={{ id, name, types: typeNames.map((t) => ({ name: t, label: typeLabels.get(t) ?? humanize(t) })) }}
              />
            ))}
          </ul>
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <a href={toQuery({ ...current, page: page - 1 })} onClick={(e) => goToPage(e, page - 1)}>
                Previous page
              </a>
            )}
            <span>
              Page {page} of {pageCount}
            </span>
            {page < pageCount && (
              <a href={toQuery({ ...current, page: page + 1 })} onClick={(e) => goToPage(e, page + 1)}>
                Next page
              </a>
            )}
          </nav>
        </>
      )}
    </>
  );
}
