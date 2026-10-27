import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { pageTitle } from "~/lib/format";
import { allTypes, englishName } from "~/lib/server-api";

export const useTypes = routeLoader$(async () =>
  (await allTypes()).map((t) => ({ name: t.name as string, label: englishName(t) })),
);

export default component$(() => {
  const types = useTypes();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-grid">
        {types.value.map((t) => (
          <li key={t.name}>
            <Link class="type-tile" style={`--badge-bg: var(--type-${t.name})`} href={`/types/${t.name}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = {
  title: pageTitle("Types"),
};
