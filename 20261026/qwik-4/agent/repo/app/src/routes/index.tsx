import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { CardList } from "~/components/pokemon-card";
import { getSpeciesIndex } from "~/lib/api";
import { SITE_NAME } from "~/lib/format";

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

interface Filters {
  q: string;
  type: string;
  generation: string;
}

function listUrl(filters: Filters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export const useSpeciesList = routeLoader$(async ({ url }) => {
  const index = await getSpeciesIndex();
  const filters: Filters = {
    q: url.searchParams.get("q") ?? "",
    type: url.searchParams.get("type") ?? "",
    generation: url.searchParams.get("generation") ?? "",
  };

  const needle = filters.q.trim().toLowerCase();
  const matches = index.entries.filter(
    (e) =>
      (!needle || e.label.toLowerCase().includes(needle)) &&
      (!filters.type || e.types.some((t) => t.name === filters.type)) &&
      (!filters.generation || e.generation === filters.generation),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Math.min(Math.max(1, Number.isFinite(requested) ? requested : 1), totalPages);

  return {
    filters,
    count: matches.length,
    page,
    totalPages,
    cards: matches
      .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
      .map(({ id, name, sprite, types }) => ({ id, name, sprite, types })),
    types: index.types,
    generations: index.generations,
    prevUrl: page > 1 ? listUrl(filters, page - 1) : null,
    nextUrl: page < totalPages ? listUrl(filters, page + 1) : null,
  };
});

export default component$(() => {
  const data = useSpeciesList();
  const nav = useNavigate();
  const query = useSignal(data.value.filters.q);
  const sentQuery = useSignal(data.value.filters.q);
  const timer = useSignal<number>();

  // Follow the URL when it changes for reasons other than typing (links, back/forward).
  useTask$(({ track }) => {
    const q = track(() => data.value.filters.q);
    if (q !== sentQuery.value) {
      query.value = q;
      sentQuery.value = q;
    }
  });

  const apply = $((patch: Partial<Filters>, replaceState = false) => {
    const filters = { ...data.value.filters, ...patch };
    return nav(listUrl(filters), { replaceState, scroll: false });
  });

  const { filters, count, page, totalPages, cards, types, generations, prevUrl, nextUrl } = data.value;

  return (
    <>
      <h1>Pokémon</h1>
      <form class="filters" preventdefault:submit role="search" aria-label="Filter Pokémon">
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            name="q"
            autocomplete="off"
            value={query.value}
            onInput$={(_, el) => {
              query.value = el.value;
              clearTimeout(timer.value);
              timer.value = setTimeout(() => {
                sentQuery.value = el.value;
                apply({ q: el.value }, true);
              }, SEARCH_DEBOUNCE_MS) as unknown as number;
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" onChange$={(_, el) => apply({ type: el.value })}>
            <option value="" selected={!filters.type}>
              All types
            </option>
            {types.map((t) => (
              <option key={t.name} value={t.name} selected={filters.type === t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" onChange$={(_, el) => apply({ generation: el.value })}>
            <option value="" selected={!filters.generation}>
              All generations
            </option>
            {generations.map((g) => (
              <option key={g.name} value={g.name} selected={filters.generation === g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {count === 0 ? (
        <p class="count">No Pokémon found</p>
      ) : (
        <>
          <p class="count" aria-live="polite">
            {count} Pokémon
          </p>
          <CardList cards={cards} />
          <nav class="pagination" aria-label="Pagination">
            {prevUrl && <Link href={prevUrl}>Previous page</Link>}
            <span>
              Page {page} of {totalPages}
            </span>
            {nextUrl && <Link href={nextUrl}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: SITE_NAME };
