import { useEffect, useRef } from "react";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import { CardList } from "../components/PokemonCard";
import { getPokemonList } from "../lib/pokeapi.server";
import { SITE_NAME } from "../lib/format";

const SEARCH_DEBOUNCE_MS = 150;

export async function loader({ url }: Route.LoaderArgs) {
  const params = url.searchParams;
  return getPokemonList({
    q: params.get("q") ?? "",
    type: params.get("type") ?? "",
    generation: params.get("generation") ?? "",
    page: Number.parseInt(params.get("page") ?? "1", 10) || 1,
  });
}

/** Builds a query string from the filters, leaving out empty and default values. */
function listHref(filters: { q?: string; type?: string; generation?: string; page?: number }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, count, page, totalPages, typeOptions, generationOptions } = loaderData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const filters = {
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    generation: searchParams.get("generation") ?? "",
  };

  // The search box is uncontrolled so typing never fights with in-flight navigations;
  // it's only overwritten when the URL changes from elsewhere (back button, links).
  const searchRef = useRef<HTMLInputElement>(null);
  const lastSearch = useRef(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (filters.q !== lastSearch.current && searchRef.current) {
      searchRef.current.value = filters.q;
      lastSearch.current = filters.q;
    }
  }, [filters.q]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const applyFilters = (next: Partial<typeof filters>, replace = false) => {
    clearTimeout(timer.current);
    const q = next.q ?? searchRef.current?.value ?? filters.q;
    lastSearch.current = q;
    navigate(listHref({ ...filters, q, ...next }), { replace, preventScrollReset: true });
  };

  const onSearch = (value: string) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => applyFilters({ q: value }, true), SEARCH_DEBOUNCE_MS);
  };

  return (
    <>
      <title>{SITE_NAME}</title>
      <h1>Pokémon</h1>
      <Form
        method="get"
        className="filters"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters({});
        }}
      >
        <div className="field field--search">
          <label htmlFor="search">Search</label>
          <input
            ref={searchRef}
            id="search"
            type="search"
            name="q"
            defaultValue={filters.q}
            autoComplete="off"
            onChange={(event) => onSearch(event.currentTarget.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" value={filters.type} onChange={(e) => applyFilters({ type: e.target.value })}>
            <option value="">All types</option>
            {typeOptions.map((t) => (
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
            name="generation"
            value={filters.generation}
            onChange={(e) => applyFilters({ generation: e.target.value })}
          >
            <option value="">All generations</option>
            {generationOptions.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </Form>

      {count === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <p className="count">{count} Pokémon</p>
          <CardList cards={cards} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && (
              <Link to={listHref({ ...filters, page: page - 1 })} rel="prev">
                Previous page
              </Link>
            )}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link to={listHref({ ...filters, page: page + 1 })} rel="next">
                Next page
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}
