import { Title } from "@solidjs/meta";
import { A, createAsync, useSearchParams, type RouteDefinition } from "@solidjs/router";
import { createEffect, For, on, onCleanup, Show } from "solid-js";
import { createSignal } from "solid-js";
import PokemonCards from "~/components/PokemonCards";
import { pageTitle } from "~/lib/format";
import { getFilterOptions, getPokemonList } from "~/lib/queries";

const SEARCH_DEBOUNCE_MS = 150;

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";

export const route = {
  preload: ({ location }) => {
    const sp = new URLSearchParams(location.search);
    getFilterOptions();
    getPokemonList(sp.get("q") ?? "", sp.get("type") ?? "", sp.get("generation") ?? "", Number(sp.get("page")) || 1);
  },
} satisfies RouteDefinition;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();
  const q = () => param(searchParams.q);
  const type = () => param(searchParams.type);
  const generation = () => param(searchParams.generation);
  const page = () => Number(param(searchParams.page)) || 1;

  const options = createAsync(() => getFilterOptions());
  const list = createAsync(() => getPokemonList(q(), type(), generation(), page()));

  // The search box keeps its own state so typing never waits for the URL.
  const [search, setSearch] = createSignal(q());
  let pushed = q();
  let timer: ReturnType<typeof setTimeout> | undefined;
  createEffect(
    on(q, (value) => {
      if (value !== pushed) {
        pushed = value;
        setSearch(value);
      }
    }),
  );
  onCleanup(() => clearTimeout(timer));

  const updateFilters = (changes: Record<string, string>, replace = false) =>
    setSearchParams({ ...changes, page: undefined }, { replace, scroll: false });

  const onSearchInput = (value: string) => {
    setSearch(value);
    clearTimeout(timer);
    timer = setTimeout(() => {
      pushed = value;
      updateFilters({ q: value }, true);
    }, SEARCH_DEBOUNCE_MS);
  };

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (q()) sp.set("q", q());
    if (type()) sp.set("type", type());
    if (generation()) sp.set("generation", generation());
    if (n > 1) sp.set("page", String(n));
    const search = sp.toString();
    return search ? `/?${search}` : "/";
  };

  return (
    <>
      <Title>{pageTitle()}</Title>
      <h1>Pokémon</h1>
      <form class="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            name="q"
            autocomplete="off"
            value={search()}
            onInput={(e) => onSearchInput(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" onChange={(e) => updateFilters({ type: e.currentTarget.value })}>
            <option value="" selected={!type()}>
              All types
            </option>
            <For each={options()?.types}>
              {(t) => (
                <option value={t.name} selected={t.name === type()}>
                  {t.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" onChange={(e) => updateFilters({ generation: e.currentTarget.value })}>
            <option value="" selected={!generation()}>
              All generations
            </option>
            <For each={options()?.generations}>
              {(g) => (
                <option value={g.name} selected={g.name === generation()}>
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
            <p class="count">{result().total} Pokémon</p>
            <Show when={result().total > 0} fallback={<p class="empty">No Pokémon found</p>}>
              <PokemonCards cards={result().items} />
              <nav class="pagination" aria-label="Pagination">
                <Show when={result().page > 1}>
                  <A href={pageHref(result().page - 1)}>Previous page</A>
                </Show>
                <span>
                  Page {result().page} of {result().totalPages}
                </span>
                <Show when={result().page < result().totalPages}>
                  <A href={pageHref(result().page + 1)}>Next page</A>
                </Show>
              </nav>
            </Show>
          </>
        )}
      </Show>
    </>
  );
}
