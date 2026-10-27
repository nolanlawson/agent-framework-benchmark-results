import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { PokemonCards } from "~/components/pokemon-cards";
import { speciesIndex, spriteUrl, type CardData } from "~/lib/api";

const PAGE_SIZE = 48;

interface Filters {
  q: string;
  type: string;
  generation: string;
  page?: number;
}

function listUrl({ q, type, generation, page }: Filters) {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  if (type) params.set("type", type);
  if (generation) params.set("generation", generation);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export const useSpeciesList = routeLoader$(async ({ url }) => {
  const index = await speciesIndex();
  const q = url.searchParams.get("q") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const generation = url.searchParams.get("generation") ?? "";
  const needle = q.trim().toLowerCase();

  const matches = index.entries.filter(
    (e) =>
      (!needle || e.label.toLowerCase().includes(needle)) &&
      (!type || e.types.includes(type)) &&
      (!generation || e.generation === generation),
  );
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const requested = parseInt(url.searchParams.get("page") ?? "1", 10);
  const page = Math.min(Math.max(Number.isFinite(requested) ? requested : 1, 1), totalPages);

  const cards: CardData[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((e) => ({
    id: e.id,
    name: e.name,
    sprite: spriteUrl(e.id),
    types: e.types.map((t) => ({ name: t, label: index.typeLabels.get(t) ?? t })),
  }));

  return {
    filters: { q, type, generation },
    count: matches.length,
    page,
    totalPages,
    cards,
    types: index.types,
    generations: index.generations,
  };
});

export default component$(() => {
  const data = useSpeciesList();
  const nav = useNavigate();
  const query = useSignal(data.value.filters.q);
  const searchRef = useSignal<HTMLInputElement>();
  const timer = useSignal<number>();

  // Keep the search box in sync with the URL (e.g. after back/forward), but never
  // overwrite what the user is typing.
  useTask$(({ track }) => {
    const q = track(() => data.value.filters.q);
    if (typeof document !== "undefined" && document.activeElement === searchRef.value) return;
    query.value = q;
  });

  const go = $((changes: Partial<Filters>) => {
    clearTimeout(timer.value);
    const form = searchRef.value?.form;
    const current: Filters = {
      q: query.value,
      type: (form?.elements.namedItem("type") as HTMLSelectElement | null)?.value ?? data.value.filters.type,
      generation:
        (form?.elements.namedItem("generation") as HTMLSelectElement | null)?.value ?? data.value.filters.generation,
    };
    return nav(listUrl({ ...current, ...changes, page: 1 }), { replaceState: "q" in changes, scroll: false });
  });

  const { filters, count, page, totalPages, cards, types, generations } = data.value;

  return (
    <>
      <h1>Pokémon</h1>
      <form
        class="filters"
        method="get"
        action="/"
        role="search"
        preventdefault:submit
        onSubmit$={() => go({})}
      >
        <div class="field filters__search">
          <label for="search">Search</label>
          <input
            id="search"
            ref={searchRef}
            type="search"
            name="q"
            autocomplete="off"
            value={query.value}
            onInput$={(_, el) => {
              query.value = el.value;
              clearTimeout(timer.value);
              timer.value = window.setTimeout(() => go({ q: el.value }), 150);
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" onChange$={(_, el) => go({ type: el.value })}>
            <option value="" selected={!filters.type}>
              All types
            </option>
            {types.map((t) => (
              <option key={t.name} value={t.name} selected={t.name === filters.type}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" onChange$={(_, el) => go({ generation: el.value })}>
            <option value="" selected={!filters.generation}>
              All generations
            </option>
            {generations.map((g) => (
              <option key={g.name} value={g.name} selected={g.name === filters.generation}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {count === 0 ? (
        <p class="muted count">No Pokémon found</p>
      ) : (
        <>
          <p class="muted count">{count} Pokémon</p>
          <PokemonCards cards={cards} />
          <nav class="pagination" aria-label="Pagination">
            {page > 1 && <Link href={listUrl({ ...filters, page: page - 1 })}>Previous page</Link>}
            <span>
              Page {page} of {totalPages}
            </span>
            {page < totalPages && <Link href={listUrl({ ...filters, page: page + 1 })}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Pokédex" };
