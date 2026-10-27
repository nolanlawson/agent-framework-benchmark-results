import { useEffect, useRef, useState } from "react";
import { Form, Link, useNavigate } from "react-router";
import type { Route } from "./+types/home";
import { CardList, Count, type Card } from "~/components/ui";
import { get, getList, idFromUrl } from "~/lib/api.server";
import { englishName, getTypes, spriteUrl } from "~/lib/data.server";
import { humanize, pageTitle } from "~/lib/format";

const PAGE_SIZE = 48;

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const type = params.get("type") ?? "";
  const generation = params.get("generation") ?? "";

  const [species, types, generations] = await Promise.all([
    getList("pokemon-species"),
    getTypes(),
    getList("generation").then((list) => Promise.all(list.map((g) => get(g.url)))),
  ]);

  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const t of types) {
    for (const { slot, pokemon } of t.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot, name: t.name });
    }
  }
  const typeLabels = new Map<string, string>(types.map((t) => [t.name, englishName(t)]));

  const generationSpecies = generations.find((g) => g.name === generation);
  const inGeneration = generationSpecies
    ? new Set<number>(generationSpecies.pokemon_species.map((s: { url: string }) => idFromUrl(s.url)))
    : null;
  const needle = q.toLowerCase();

  const matches = species
    .map((s) => ({ id: idFromUrl(s.url), name: s.name }))
    .filter(({ id, name }) => {
      if (needle && !humanize(name).toLowerCase().includes(needle)) return false;
      if (type && !typesById.get(id)?.some((t) => t.name === type)) return false;
      if (generation && !inGeneration?.has(id)) return false;
      return true;
    })
    .sort((a, b) => a.id - b.id);

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const page = Math.min(Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1), totalPages);
  const cards: Card[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ id, name }) => ({
    id,
    name,
    sprite: spriteUrl(id),
    types: (typesById.get(id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.name, label: typeLabels.get(t.name)! })),
  }));

  return {
    filters: { q, type, generation },
    typeOptions: types.map((t) => ({ name: t.name as string, label: englishName(t) })),
    generationOptions: generations.map((g) => ({ name: g.name as string, label: englishName(g) })),
    count: matches.length,
    page,
    totalPages,
    cards,
  };
}

type Filters = { q: string; type: string; generation: string; page?: number };

function searchFor({ q, type, generation, page }: Filters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (type) params.set("type", type);
  if (generation) params.set("generation", generation);
  if (page && page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { filters, typeOptions, generationOptions, count, page, totalPages, cards } = loaderData;
  const navigate = useNavigate();
  const [q, setQ] = useState(filters.q);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Follow URL changes (back/forward, links) unless the user is typing in the box.
  useEffect(() => {
    if (document.activeElement !== searchRef.current) setQ(filters.q);
  }, [filters.q]);
  useEffect(() => () => clearTimeout(debounce.current), []);

  const go = (next: Partial<Filters>, replace = false) => {
    clearTimeout(debounce.current);
    navigate({ pathname: "/", search: searchFor({ ...filters, q, ...next, page: 1 }) }, { replace, preventScrollReset: true });
  };

  return (
    <>
      <title>{pageTitle()}</title>
      <h1>Pokémon</h1>
      <Form
        method="get"
        className="filters"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          go({});
        }}
      >
        <div className="field field-search">
          <label htmlFor="filter-q">Search</label>
          <input
            ref={searchRef}
            id="filter-q"
            type="search"
            name="q"
            value={q}
            autoComplete="off"
            onChange={(event) => {
              const value = event.target.value;
              setQ(value);
              clearTimeout(debounce.current);
              debounce.current = setTimeout(() => go({ q: value }, true), 150);
            }}
          />
        </div>
        <div className="field">
          <label htmlFor="filter-type">Type</label>
          <select id="filter-type" name="type" value={filters.type} onChange={(event) => go({ type: event.target.value })}>
            <option value="">All types</option>
            {typeOptions.map((t) => (
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
            name="generation"
            value={filters.generation}
            onChange={(event) => go({ generation: event.target.value })}
          >
            <option value="">All generations</option>
            {generationOptions.map((g) => (
              <option key={g.name} value={g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
        <noscript>
          <button type="submit">Apply filters</button>
        </noscript>
      </Form>

      {count === 0 ? (
        <p className="count">No Pokémon found</p>
      ) : (
        <>
          <Count n={count} />
          <CardList cards={cards} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && <Link to={searchFor({ ...filters, page: page - 1 }) || "/"}>Previous page</Link>}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && <Link to={searchFor({ ...filters, page: page + 1 })}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
}
