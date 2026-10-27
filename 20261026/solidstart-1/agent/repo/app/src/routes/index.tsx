import { createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import { CardList } from "~/components/PokemonCard";
import { PageTitle } from "~/components/PageTitle";
import { getHome } from "~/lib/queries";
import type { HomeFilters } from "~/lib/types";

const SEARCH_DEBOUNCE_MS = 150;

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function filtersFrom(params: Record<string, string | string[] | undefined>): HomeFilters {
  return {
    q: param(params.q),
    type: param(params.type),
    generation: param(params.generation),
    page: Number(param(params.page)) || 1,
  };
}

/** Query string for a filter state, leaving out empty and default values. */
function searchFor(filters: HomeFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.generation) params.set("generation", filters.generation);
  if (filters.page > 1) params.set("page", String(filters.page));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export const route = {
  preload: ({ location }) => {
    getHome(filtersFrom(Object.fromEntries(new URLSearchParams(location.search))));
  },
} satisfies RouteDefinition;

export default function Home() {
  const [params, setParams] = useSearchParams();
  const filters = () => filtersFrom(params);
  const data = createAsync(() => getHome(filters()));

  // The search box keeps its own state so typing is never interrupted by a pending fetch.
  const [search, setSearch] = createSignal(filters().q);
  let pushedQuery = filters().q;
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));

  createEffect(
    on(
      () => filters().q,
      (q) => {
        if (q !== pushedQuery) {
          pushedQuery = q;
          setSearch(q);
        }
      },
      { defer: true },
    ),
  );

  const onSearch = (value: string) => {
    setSearch(value);
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushedQuery = value;
      setParams({ q: value || undefined, page: undefined }, { replace: true });
    }, SEARCH_DEBOUNCE_MS);
  };

  const setFilter = (key: "type" | "generation", value: string) =>
    setParams({ [key]: value || undefined, page: undefined });

  return (
    <>
      <PageTitle />
      <h1 class="page-title">Pokémon</h1>
      <form class="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div class="field field--search">
          <label for="search">Search</label>
          <input
            id="search"
            name="q"
            type="search"
            autocomplete="off"
            value={search()}
            onInput={(e) => onSearch(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" onChange={(e) => setFilter("type", e.currentTarget.value)}>
            <option value="" selected={!filters().type}>
              All types
            </option>
            <For each={data()?.types}>
              {(t) => (
                <option value={t.name} selected={filters().type === t.name}>
                  {t.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" onChange={(e) => setFilter("generation", e.currentTarget.value)}>
            <option value="" selected={!filters().generation}>
              All generations
            </option>
            <For each={data()?.generations}>
              {(g) => (
                <option value={g.name} selected={filters().generation === g.name}>
                  {g.label}
                </option>
              )}
            </For>
          </select>
        </div>
      </form>

      <Show when={data()}>
        {(home) => (
          <>
            <p class="count" aria-live="polite">
              {home().count} Pokémon
            </p>
            <Show when={home().count > 0} fallback={<p class="empty">No Pokémon found</p>}>
              <CardList cards={home().cards} />
              <nav class="pagination" aria-label="Pagination">
                <Show when={home().page > 1}>
                  <a href={searchFor({ ...filters(), page: home().page - 1 })}>Previous page</a>
                </Show>
                <span>
                  Page {home().page} of {home().totalPages}
                </span>
                <Show when={home().page < home().totalPages}>
                  <a href={searchFor({ ...filters(), page: home().page + 1 })}>Next page</a>
                </Show>
              </nav>
            </Show>
          </>
        )}
      </Show>
    </>
  );
}
