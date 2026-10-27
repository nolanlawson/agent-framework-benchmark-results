import { component$, useSignal, useTask$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { CardList } from "~/components/cards";
import { allGenerations, allTypes, englishName, speciesIndex } from "~/lib/server-api";
import type { Card } from "~/lib/types";

const PAGE_SIZE = 48;
const SEARCH_DEBOUNCE_MS = 200;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page: number;
}

/** `/` plus the query for the given filters, leaving out empty and default values. */
function homeHref(filters: Filters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export const useHome = routeLoader$(async ({ query }) => {
  const [index, types, generations] = await Promise.all([
    speciesIndex(),
    allTypes(),
    allGenerations(),
  ]);

  const q = query.get("q") ?? "";
  const type = query.get("type") ?? "";
  const generation = query.get("generation") ?? "";
  const needle = q.trim().toLowerCase();

  const matches = index.filter(
    (s) =>
      (!needle || s.label.toLowerCase().includes(needle)) &&
      (!type || s.types.some((t) => t.name === type)) &&
      (!generation || s.generation === generation),
  );

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = parseInt(query.get("page") ?? "1", 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);
  const cards: Card[] = matches
    .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    .map(({ id, name, label, sprite, types }) => ({ id, name, label, sprite, types }));

  return {
    filters: { q, type, generation, page } as Filters,
    count: matches.length,
    totalPages,
    cards,
    typeOptions: types.map((t) => ({ value: t.name, label: englishName(t) })),
    generationOptions: generations.map((g) => ({ value: g.name, label: englishName(g) })),
  };
});

export default component$(() => {
  const data = useHome();
  const nav = useNavigate();
  const search = useSignal(data.value.filters.q);
  const searchInput = useSignal<HTMLInputElement>();
  const timer = useSignal<number>();

  // Keep the search box in step with the URL (e.g. after back/forward navigation),
  // but never overwrite what the user is typing.
  useTask$(({ track }) => {
    const q = track(() => data.value.filters.q);
    if (typeof document !== "undefined" && document.activeElement === searchInput.value) return;
    search.value = q;
  });

  const { filters, count, totalPages, cards, typeOptions, generationOptions } = data.value;

  return (
    <>
      <h1>Pokémon</h1>
      <form
        class="filters"
        method="get"
        action="/"
        preventdefault:submit
        onSubmit$={() => {
          clearTimeout(timer.value);
          return nav(homeHref({ ...data.value.filters, q: search.value, page: 1 }), {
            replaceState: true,
            scroll: false,
          });
        }}
      >
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            ref={searchInput}
            id="search"
            type="search"
            name="q"
            autoComplete="off"
            value={search.value}
            onInput$={(_, el) => {
              search.value = el.value;
              clearTimeout(timer.value);
              timer.value = window.setTimeout(() => {
                const current = new URL(window.location.href).searchParams.get("q") ?? "";
                if (current === search.value) return;
                nav(homeHref({ ...data.value.filters, q: search.value, page: 1 }), {
                  replaceState: true,
                  scroll: false,
                });
              }, SEARCH_DEBOUNCE_MS);
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select
            id="type"
            name="type"
            onChange$={(_, el) =>
              nav(homeHref({ ...data.value.filters, q: search.value, type: el.value, page: 1 }), {
                scroll: false,
              })
            }
          >
            <option value="" selected={!filters.type}>
              All types
            </option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value} selected={o.value === filters.type}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select
            id="generation"
            name="generation"
            onChange$={(_, el) =>
              nav(
                homeHref({ ...data.value.filters, q: search.value, generation: el.value, page: 1 }),
                { scroll: false },
              )
            }
          >
            <option value="" selected={!filters.generation}>
              All generations
            </option>
            {generationOptions.map((o) => (
              <option key={o.value} value={o.value} selected={o.value === filters.generation}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <p class="count" aria-live="polite">
        {count} Pokémon
      </p>

      {count === 0 ? (
        <p class="empty">No Pokémon found</p>
      ) : (
        <>
          <CardList cards={cards} />
          <nav class="pagination" aria-label="Pagination">
            {filters.page > 1 && (
              <Link href={homeHref({ ...filters, page: filters.page - 1 })}>Previous page</Link>
            )}
            <span>
              Page {filters.page} of {totalPages}
            </span>
            {filters.page < totalPages && (
              <Link href={homeHref({ ...filters, page: filters.page + 1 })}>Next page</Link>
            )}
          </nav>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = {
  title: "Pokédex",
};
