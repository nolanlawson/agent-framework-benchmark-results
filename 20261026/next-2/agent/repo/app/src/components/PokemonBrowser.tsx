'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { humanize } from '@/lib/format';
import { CardGrid, PokemonCard } from './PokemonCard';

const PAGE_SIZE = 48;

interface Option {
  name: string;
  label: string;
}

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

function buildUrl({ q, type, generation, page }: Filters) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (type) params.set('type', type);
  if (generation) params.set('generation', generation);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/?${query}` : '/';
}

export function PokemonBrowser({
  index,
  types,
  generations,
  spriteBase,
}: {
  index: { id: number; name: string; types: string[]; generation: string | null }[];
  types: Option[];
  generations: Option[];
  spriteBase: string;
}) {
  const params = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const type = params.get('type') ?? '';
  const generation = params.get('generation') ?? '';
  const requestedPage = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);

  // The search box keeps its own state so typing stays responsive; it follows the URL only
  // when the URL changes for another reason (back/forward navigation, links).
  const [query, setQuery] = useState(urlQuery);
  const lastWrittenQuery = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery !== lastWrittenQuery.current) {
      lastWrittenQuery.current = urlQuery;
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  const typeLabels = useMemo(() => new Map(types.map((t) => [t.name, t.label])), [types]);
  const searchable = useMemo(() => index.map((entry) => ({ entry, haystack: humanize(entry.name).toLowerCase() })), [index]);

  const needle = query.trim().toLowerCase();
  const matches = searchable
    .filter(
      ({ entry, haystack }) =>
        (!needle || haystack.includes(needle)) &&
        (!type || entry.types.includes(type)) &&
        (!generation || entry.generation === generation),
    )
    .map(({ entry }) => entry);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const visible = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const current: Filters = { q: query.trim() ? query : '', type, generation, page };

  function navigate(next: Filters, mode: 'push' | 'replace') {
    lastWrittenQuery.current = next.q;
    const url = buildUrl(next);
    if (mode === 'push') window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
  }

  function onPageLink(event: React.MouseEvent<HTMLAnchorElement>, target: number) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate({ ...current, page: target }, 'push');
    window.scrollTo(0, 0);
  }

  return (
    <>
      <form className="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div className="field field-search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            value={query}
            autoComplete="off"
            onChange={(e) => {
              const value = e.target.value;
              setQuery(value);
              navigate({ ...current, q: value.trim() ? value : '', page: 1 }, 'replace');
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" value={type} onChange={(e) => navigate({ ...current, type: e.target.value, page: 1 }, 'push')}>
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
            value={generation}
            onChange={(e) => navigate({ ...current, generation: e.target.value, page: 1 }, 'push')}
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
          <CardGrid>
            {visible.map((entry) => (
              <li key={entry.id}>
                <PokemonCard
                  id={entry.id}
                  name={entry.name}
                  spriteBase={spriteBase}
                  types={entry.types.map((t) => ({ name: t, label: typeLabels.get(t) ?? humanize(t) }))}
                />
              </li>
            ))}
          </CardGrid>
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <a href={buildUrl({ ...current, page: page - 1 })} onClick={(e) => onPageLink(e, page - 1)}>
                Previous page
              </a>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <a href={buildUrl({ ...current, page: page + 1 })} onClick={(e) => onPageLink(e, page + 1)}>
                Next page
              </a>
            )}
          </nav>
        </>
      )}
    </>
  );
}
