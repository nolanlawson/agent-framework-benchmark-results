'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { PokemonCardList } from '@/components/PokemonCard';
import { humanize } from '@/lib/format';
import type { IndexEntry } from '@/lib/api';

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 150;

type Option = { name: string; label: string };
type Props = { entries: IndexEntry[]; types: Option[]; generations: Option[]; apiBase: string };
type Filters = { q: string; type: string; generation: string; page: number };

function toQuery({ q, type, generation, page }: Filters) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function PokemonBrowser({ entries, types, generations, apiBase }: Props) {
  const searchParams = useSearchParams();
  const urlFilters: Filters = {
    q: searchParams.get('q') ?? '',
    type: searchParams.get('type') ?? '',
    generation: searchParams.get('generation') ?? '',
    page: Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1),
  };

  // The search box updates results immediately; the URL follows after a short pause.
  const [query, setQuery] = useState(urlFilters.q);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!pending.current) setQuery(urlFilters.q);
  }, [urlFilters.q]);
  useEffect(() => () => clearTimeout(pending.current ?? undefined), []);

  const typeLabels = useMemo(() => new Map(types.map((t) => [t.name, t.label])), [types]);
  const searchable = useMemo(() => entries.map((e) => humanize(e.name).toLowerCase()), [entries]);

  const needle = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      entries.filter(
        (e, i) =>
          (!needle || searchable[i].includes(needle)) &&
          (!urlFilters.type || e.types.includes(urlFilters.type)) &&
          (!urlFilters.generation || e.generation === urlFilters.generation),
      ),
    [entries, searchable, needle, urlFilters.type, urlFilters.generation],
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  // While a search is still being written to the URL, its results start at page 1.
  const page = Math.min(query === urlFilters.q ? urlFilters.page : 1, totalPages);
  const shown = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const current: Filters = { ...urlFilters, q: query, page };

  function onSearch(value: string) {
    setQuery(value);
    clearTimeout(pending.current ?? undefined);
    pending.current = setTimeout(() => {
      pending.current = null;
      window.history.replaceState(null, '', toQuery({ ...urlFilters, q: value.trim(), page: 1 }));
    }, SEARCH_DEBOUNCE_MS);
  }

  function onFilter(change: Partial<Filters>) {
    window.history.pushState(null, '', toQuery({ ...current, q: query.trim(), ...change, page: 1 }));
  }

  function onPage(event: MouseEvent<HTMLAnchorElement>, target: number) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    window.history.pushState(null, '', toQuery({ ...current, q: query.trim(), page: target }));
    window.scrollTo(0, 0);
  }

  return (
    <>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input id="search" type="search" value={query} onChange={(e) => onSearch(e.target.value)} autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={urlFilters.type} onChange={(e) => onFilter({ type: e.target.value })}>
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
          <select id="generation" value={urlFilters.generation} onChange={(e) => onFilter({ generation: e.target.value })}>
            <option value="">All generations</option>
            {generations.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {matches.length === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <p className="count">{matches.length} Pokémon</p>
          <PokemonCardList
            apiBase={apiBase}
            cards={shown.map((e) => ({
              id: e.id,
              name: e.name,
              types: e.types.map((t) => ({ name: t, label: typeLabels.get(t) ?? humanize(t) })),
            }))}
          />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <a href={toQuery({ ...current, page: page - 1 })} onClick={(e) => onPage(e, page - 1)}>
                Previous page
              </a>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a href={toQuery({ ...current, page: page + 1 })} onClick={(e) => onPage(e, page + 1)}>
                Next page
              </a>
            )}
          </nav>
        </>
      )}
    </>
  );
}
