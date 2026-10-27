import { createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, For, on, onCleanup, Show } from "solid-js";
import { CardGrid, PageTitle } from "~/components/ui";
import { getFilterOptions, getPokemonList } from "~/lib/data";

type Params = { q?: string; type?: string; generation?: string; page?: string };

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

function readFilters(params: Partial<Record<keyof Params, string | string[]>>) {
  return {
    q: one(params.q),
    type: one(params.type),
    generation: one(params.generation),
    page: Math.max(1, parseInt(one(params.page), 10) || 1),
  };
}

export const route = {
  preload: ({ location }) => {
    const f = readFilters(location.query);
    getFilterOptions();
    getPokemonList(f.q, f.type, f.generation, f.page);
  },
} satisfies RouteDefinition;

const SEARCH_DEBOUNCE_MS = 150;

export default function Home() {
  const [params, setParams] = useSearchParams<Params>();
  const filters = () => readFilters(params);
  const options = createAsync(() => getFilterOptions());
  const list = createAsync(() => {
    const f = filters();
    return getPokemonList(f.q, f.type, f.generation, f.page);
  });

  /** Updates filters in the URL, dropping empty values and resetting to page 1. */
  const update = (changes: Partial<Params>, replace = false) =>
    setParams({ ...changes, page: undefined }, { replace, scroll: false });

  // The search box is left alone while the user types; the URL follows it (debounced).
  // It only takes its value from the URL when the URL changes for another reason
  // (back/forward navigation, a link).
  let searchInput!: HTMLInputElement;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pushed: string | undefined;
  onCleanup(() => clearTimeout(timer));
  const onSearch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushed = searchInput.value;
      update({ q: searchInput.value.trim() ? searchInput.value : undefined }, true);
    }, SEARCH_DEBOUNCE_MS);
  };
  createEffect(
    on(
      () => filters().q,
      (q) => {
        if (pushed !== undefined && q === (pushed.trim() ? pushed : "")) return;
        pushed = undefined;
        if (searchInput && searchInput.value !== q) searchInput.value = q;
      },
      { defer: true },
    ),
  );

  const pageHref = (page: number) => {
    const search = new URLSearchParams();
    const f = filters();
    if (f.q) search.set("q", f.q);
    if (f.type) search.set("type", f.type);
    if (f.generation) search.set("generation", f.generation);
    if (page > 1) search.set("page", String(page));
    const qs = search.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <>
      <PageTitle />
      <h1 class="page-title">Pokémon</h1>

      <form class="filters" role="search" action="/" method="get" onSubmit={(e) => e.preventDefault()}>
        <div class="field filters__search">
          <label for="filter-q">Search</label>
          <input
            ref={searchInput}
            id="filter-q"
            name="q"
            type="search"
            autocomplete="off"
            spellcheck={false}
            value={filters().q}
            onInput={onSearch}
          />
        </div>
        <div class="field">
          <label for="filter-type">Type</label>
          <select id="filter-type" name="type" onChange={(e) => update({ type: e.currentTarget.value || undefined })}>
            <option value="" selected={!filters().type}>
              All types
            </option>
            <For each={options()?.types}>
              {(t) => (
                <option value={t.name} selected={filters().type === t.name}>
                  {t.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="filter-generation">Generation</label>
          <select
            id="filter-generation"
            name="generation"
            onChange={(e) => update({ generation: e.currentTarget.value || undefined })}
          >
            <option value="" selected={!filters().generation}>
              All generations
            </option>
            <For each={options()?.generations}>
              {(g) => (
                <option value={g.name} selected={filters().generation === g.name}>
                  {g.label}
                </option>
              )}
            </For>
          </select>
        </div>
      </form>

      <Show when={list()}>
        {(result) => (
          <>
            <p class="count" role="status">
              {result().total > 0 ? `${result().total} Pokémon` : "No Pokémon found"}
            </p>
            <Show when={result().total > 0}>
              <CardGrid cards={result().cards} />
              <nav class="pagination" aria-label="Pagination">
                <Show when={result().page > 1}>
                  <a href={pageHref(result().page - 1)} rel="prev">
                    Previous page
                  </a>
                </Show>
                <span>
                  Page {result().page} of {result().pages}
                </span>
                <Show when={result().page < result().pages}>
                  <a href={pageHref(result().page + 1)} rel="next">
                    Next page
                  </a>
                </Show>
              </nav>
            </Show>
          </>
        )}
      </Show>
    </>
  );
}
