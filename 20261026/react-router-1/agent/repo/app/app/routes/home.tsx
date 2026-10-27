import { useEffect, useRef, useState } from "react";
import { Form, Link, useLocation, useNavigate, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import { getGenerations, getSpeciesIndex, getTypes, spriteUrl, type CardData } from "~/lib/api.server";
import { CardList, Count } from "~/components/ui";
import { pageTitle } from "~/lib/format";

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

type Filters = { q: string; type: string; generation: string };

function readFilters(search: string | URLSearchParams): Filters & { page: number } {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const page = Number.parseInt(params.get("page") ?? "1", 10);
  return {
    q: params.get("q") ?? "",
    type: params.get("type") ?? "",
    generation: params.get("generation") ?? "",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function listHref(filters: Filters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export async function loader({ request }: Route.LoaderArgs) {
  const filters = readFilters(new URL(request.url).searchParams);
  const [index, types, generations] = await Promise.all([getSpeciesIndex(), getTypes(), getGenerations()]);

  const needle = filters.q.trim().toLowerCase();
  const matches = index.filter(
    (species) =>
      (!needle || species.label.toLowerCase().includes(needle)) &&
      (!filters.type || species.types.some((t) => t.name === filters.type)) &&
      (!filters.generation || species.generation === filters.generation),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(filters.page, totalPages);
  const cards: CardData[] = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map((species) => ({ id: species.id, name: species.name, sprite: spriteUrl(species.id), types: species.types }));

  return {
    filters: { q: filters.q, type: filters.type, generation: filters.generation },
    page,
    totalPages,
    count: matches.length,
    cards,
    typeOptions: types.map(({ name, label }) => ({ name, label })),
    generationOptions: generations.map(({ name, label }) => ({ name, label })),
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { filters, page, totalPages, count, cards, typeOptions, generationOptions } = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();

  // While a filter change is loading, show the selects at their new values.
  const pendingLocation = navigation.location?.pathname === "/" ? navigation.location : undefined;
  const shown = pendingLocation ? readFilters(pendingLocation.search) : readFilters(location.search);

  const [query, setQuery] = useState(filters.q);
  const lastSentQuery = useRef(filters.q);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow the URL when it changes from elsewhere (back button, nav links), but don't
  // clobber what the user is typing.
  useEffect(() => {
    if (filters.q !== lastSentQuery.current) {
      lastSentQuery.current = filters.q;
      setQuery(filters.q);
    }
  }, [filters.q]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function go(next: Filters, replace = false) {
    clearTimeout(timer.current);
    lastSentQuery.current = next.q;
    navigate(listHref(next), { replace, preventScrollReset: true });
  }

  function onSearchChange(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => go({ ...shown, q: value }, true), SEARCH_DEBOUNCE_MS);
  }

  return (
    <>
      <title>{pageTitle()}</title>
      <h1>Pokémon</h1>

      <Form
        method="get"
        action="/"
        className="filters"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go({ ...shown, q: query });
        }}
      >
        <div className="field field--search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            name="q"
            type="search"
            autoComplete="off"
            value={query}
            onChange={(event) => onSearchChange(event.currentTarget.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            name="type"
            value={shown.type}
            onChange={(event) => go({ ...shown, q: query, type: event.currentTarget.value })}
          >
            <option value="">All types</option>
            {typeOptions.map((type) => (
              <option key={type.name} value={type.name}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="generation">Generation</label>
          <select
            id="generation"
            name="generation"
            value={shown.generation}
            onChange={(event) => go({ ...shown, q: query, generation: event.currentTarget.value })}
          >
            <option value="">All generations</option>
            {generationOptions.map((generation) => (
              <option key={generation.name} value={generation.name}>
                {generation.label}
              </option>
            ))}
          </select>
        </div>
      </Form>

      {count === 0 ? (
        <p className="empty">No Pokémon found</p>
      ) : (
        <>
          <Count n={count} />
          <CardList cards={cards} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && <Link to={listHref(filters, page - 1)}>Previous page</Link>}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && <Link to={listHref(filters, page + 1)}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
}
