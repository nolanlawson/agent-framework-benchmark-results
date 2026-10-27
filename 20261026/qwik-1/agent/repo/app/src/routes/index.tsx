import { $, component$, useSignal, useTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { CardList } from "~/components/ui";
import { homeData, parseFilters } from "~/lib/home";
import { homeHref } from "~/lib/format";

export const useHome = routeLoader$(async ({ url }) => homeData(parseFilters(url.searchParams)));

export default component$(() => {
  const data = useHome();
  const nav = useNavigate();
  const query = useSignal(data.value.filters.q);
  const timer = useSignal<number>(0);

  // Keep the search box in sync when the URL changes from elsewhere (back/forward, links).
  useTask$(({ track }) => {
    const q = track(() => data.value.filters.q);
    if (!timer.value) query.value = q;
  });

  const go = $((patch: { q?: string; type?: string; generation?: string }, replace = false) => {
    const f = data.value.filters;
    return nav(homeHref({ q: f.q, type: f.type, generation: f.generation, ...patch, page: 1 }), {
      replaceState: replace,
      scroll: false,
    });
  });

  const d = data.value;
  const f = d.filters;
  return (
    <>
      <h1>Pokémon</h1>
      <form class="filters" preventdefault:submit role="search">
        <div class="field field-search">
          <label for="search">Search</label>
          <input
            id="search"
            type="search"
            name="q"
            autoComplete="off"
            value={query.value}
            onInput$={(_, el) => {
              query.value = el.value;
              clearTimeout(timer.value);
              timer.value = setTimeout(() => {
                timer.value = 0;
                go({ q: query.value.trim() ? query.value : "" }, true);
              }, 200) as unknown as number;
            }}
          />
        </div>
        <div class="field">
          <label for="type">Type</label>
          <select id="type" name="type" onChange$={(_, el) => go({ type: el.value })}>
            <option value="" selected={!f.type}>
              All types
            </option>
            {d.typeOptions.map((t) => (
              <option key={t.name} value={t.name} selected={f.type === t.name}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div class="field">
          <label for="generation">Generation</label>
          <select id="generation" name="generation" onChange$={(_, el) => go({ generation: el.value })}>
            <option value="" selected={!f.generation}>
              All generations
            </option>
            {d.genOptions.map((g) => (
              <option key={g.name} value={g.name} selected={f.generation === g.name}>
                {g.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      {d.count === 0 ? (
        <p class="muted count">No Pokémon found</p>
      ) : (
        <>
          <p class="muted count">{d.count} Pokémon</p>
          <CardList cards={d.cards} />
          <nav class="pagination" aria-label="Pagination">
            {f.page > 1 && <Link href={homeHref({ ...f, page: f.page - 1 })}>Previous page</Link>}
            <span>
              Page {f.page} of {d.totalPages}
            </span>
            {f.page < d.totalPages && <Link href={homeHref({ ...f, page: f.page + 1 })}>Next page</Link>}
          </nav>
        </>
      )}
    </>
  );
});

export const head: DocumentHead = { title: "Pokédex" };
