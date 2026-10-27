import { createAsync, useSearchParams } from "@solidjs/router";
import { createEffect, createMemo, createSignal, For, on, Show } from "solid-js";
import { CardList, Count, PageTitle } from "~/components/ui";
import { humanize } from "~/lib/format";
import { getPokedexIndex } from "~/lib/queries";

const PAGE_SIZE = 48;

type Params = { q?: string; type?: string; generation?: string; page?: string };

export default function Home() {
  const index = createAsync(() => getPokedexIndex(), { deferStream: true });
  const [params, setParams] = useSearchParams<Params>();

  // The search box drives the results directly; the URL follows along.
  const [search, setSearch] = createSignal(params.q ?? "");
  let input: HTMLInputElement | undefined;
  createEffect(
    on(
      () => params.q,
      (q) => {
        if (document.activeElement !== input) setSearch(q ?? "");
      },
      { defer: true },
    ),
  );

  const typeLabels = createMemo(() => new Map(index()?.types.map((t) => [t.name, t.label])));

  const matches = createMemo(() => {
    const data = index();
    if (!data) return [];
    const q = search().trim().toLowerCase();
    return data.species.filter(
      (s) =>
        (!q || humanize(s.name).toLowerCase().includes(q)) &&
        (!params.type || s.types.includes(params.type)) &&
        (!params.generation || s.generation === params.generation),
    );
  });

  const totalPages = () => Math.max(1, Math.ceil(matches().length / PAGE_SIZE));
  const page = () => Math.min(Math.max(1, parseInt(params.page ?? "1", 10) || 1), totalPages());
  const visible = () => matches().slice((page() - 1) * PAGE_SIZE, page() * PAGE_SIZE);

  const pageHref = (n: number) => {
    const sp = new URLSearchParams();
    if (search().trim()) sp.set("q", search().trim());
    if (params.type) sp.set("type", params.type);
    if (params.generation) sp.set("generation", params.generation);
    if (n > 1) sp.set("page", String(n));
    const qs = sp.toString();
    return qs ? `/?${qs}` : "/";
  };

  const onSearch = (value: string) => {
    setSearch(value);
    setParams({ q: value.trim() || undefined, page: undefined }, { replace: true });
  };

  return (
    <>
      <PageTitle />
      <h1>Pokémon</h1>
      <form class="filters" role="search" onSubmit={(e) => e.preventDefault()}>
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            ref={input}
            id="search"
            type="search"
            name="q"
            autocomplete="off"
            value={search()}
            onInput={(e) => onSearch(e.currentTarget.value)}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select
            id="type"
            name="type"
            onChange={(e) => setParams({ type: e.currentTarget.value || undefined, page: undefined })}
          >
            <option value="" selected={!params.type}>
              All types
            </option>
            <For each={index()?.types}>
              {(t) => (
                <option value={t.name} selected={params.type === t.name}>
                  {t.label}
                </option>
              )}
            </For>
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select
            id="generation"
            name="generation"
            onChange={(e) => setParams({ generation: e.currentTarget.value || undefined, page: undefined })}
          >
            <option value="" selected={!params.generation}>
              All generations
            </option>
            <For each={index()?.generations}>
              {(g) => (
                <option value={g.name} selected={params.generation === g.name}>
                  {g.label}
                </option>
              )}
            </For>
          </select>
        </div>
      </form>

      <Show when={index()}>
        <Count n={matches().length} />
        <Show when={matches().length} fallback={<p class="empty">No Pokémon found</p>}>
          <CardList cards={visible()} typeLabels={typeLabels()} />
          <nav class="pagination" aria-label="Pagination">
            <Show when={page() > 1}>
              <a href={pageHref(page() - 1)}>Previous page</a>
            </Show>
            <span>
              Page {page()} of {totalPages()}
            </span>
            <Show when={page() < totalPages()}>
              <a href={pageHref(page() + 1)}>Next page</a>
            </Show>
          </nav>
        </Show>
      </Show>
    </>
  );
}
