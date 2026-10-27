import { useEffect, useRef, useState } from "react";
import { Form, Link, useNavigate, useSearchParams } from "react-router";
import type { Route } from "./+types/home";
import {
  englishName,
  getGenerations,
  getMainTypes,
  getSpeciesIndex,
  spriteUrl,
  type Card,
} from "~/lib/api.server";
import { idFromUrl, humanize } from "~/lib/format";
import { CardList, Count } from "~/components/ui";

const PAGE_SIZE = 48;

export const meta: Route.MetaFunction = () => [{ title: "Pokédex" }];

export async function loader({ request }: Route.LoaderArgs) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const type = params.get("type") ?? "";
  const generation = params.get("generation") ?? "";

  const [species, types, generations] = await Promise.all([
    getSpeciesIndex(),
    getMainTypes(),
    getGenerations(),
  ]);

  const typeLabels = new Map(types.map((t) => [t.name, englishName(t)]));
  const typesById = new Map<number, { slot: number; name: string }[]>();
  for (const t of types) {
    for (const { slot, pokemon } of t.pokemon) {
      const id = idFromUrl(pokemon.url);
      if (!typesById.has(id)) typesById.set(id, []);
      typesById.get(id)!.push({ slot, name: t.name });
    }
  }

  let ids = [...species.keys()].filter((id) => id <= 10000).sort((a, b) => a - b);
  if (q) {
    const needle = q.toLowerCase();
    ids = ids.filter((id) => humanize(species.get(id)!).toLowerCase().includes(needle));
  }
  if (type) {
    ids = ids.filter((id) => typesById.get(id)?.some((t) => t.name === type));
  }
  if (generation) {
    const gen = generations.find((g) => g.name === generation);
    const inGen = new Set(gen?.pokemon_species.map((s) => idFromUrl(s.url)));
    ids = ids.filter((id) => inGen.has(id));
  }

  const total = ids.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(1, requested), pageCount) : 1;

  const cards: Card[] = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((id) => ({
    id,
    name: species.get(id)!,
    sprite: spriteUrl(id),
    types: (typesById.get(id) ?? [])
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.name, label: typeLabels.get(t.name) ?? humanize(t.name) })),
  }));

  return {
    cards,
    total,
    page,
    pageCount,
    typeOptions: types.map((t) => ({ value: t.name, label: englishName(t) })),
    generationOptions: generations.map((g) => ({ value: g.name, label: englishName(g) })),
  };
}

/** Builds a query string, leaving out empty and default values. */
function queryFor(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined || value === "" || (key === "page" && Number(value) <= 1)) continue;
    params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { cards, total, page, pageCount, typeOptions, generationOptions } = loaderData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filters = {
    q: searchParams.get("q") ?? "",
    type: searchParams.get("type") ?? "",
    generation: searchParams.get("generation") ?? "",
  };

  // The search box is controlled locally so typing stays responsive; the URL follows
  // after a short debounce. External URL changes (back/forward, links) flow back in.
  const [query, setQuery] = useState(filters.q);
  const lastPushed = useRef(filters.q);
  useEffect(() => {
    if (filters.q !== lastPushed.current) {
      lastPushed.current = filters.q;
      setQuery(filters.q);
    }
  }, [filters.q]);

  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounce.current), []);

  function update(changes: Partial<typeof filters>, replace = false) {
    const next = { ...filters, q: lastPushed.current, ...changes };
    lastPushed.current = next.q;
    navigate(`/${queryFor(next)}`, { replace, preventScrollReset: true });
  }

  function onSearch(value: string) {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => update({ q: value.trim() }, true), 150);
  }

  const pageLink = (n: number) => `/${queryFor({ ...filters, page: n })}`;

  return (
    <>
      <h1 className="page-title">Pokémon</h1>
      <Form
        method="get"
        className="filters"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(debounce.current);
          update({ q: query.trim() });
        }}
      >
        <div className="field field--search">
          <label htmlFor="search">Search</label>
          <input
            id="search"
            type="search"
            name="q"
            value={query}
            onChange={(e) => onSearch(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="type">Type</label>
          <select id="type" name="type" value={filters.type} onChange={(e) => update({ type: e.target.value })}>
            <option value="">All types</option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
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
            onChange={(e) => update({ generation: e.target.value })}
          >
            <option value="">All generations</option>
            {generationOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <noscript>
          <button type="submit">Apply filters</button>
        </noscript>
      </Form>

      <Count n={total} />
      {total === 0 ? (
        <p className="empty">No Pokémon found</p>
      ) : (
        <>
          <CardList cards={cards} />
          <nav className="pagination" aria-label="Pagination">
            {page > 1 && <Link to={pageLink(page - 1)}>Previous page</Link>}
            <span>
              Page {page} of {pageCount}
            </span>
            {page < pageCount && <Link to={pageLink(page + 1)}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
}
