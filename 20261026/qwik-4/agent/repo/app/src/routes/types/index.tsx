import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { getTypeLabels, getTypeList, typeRef } from "~/lib/api";
import { pageTitle } from "~/lib/format";

export const useTypes = routeLoader$(async () => {
  const [list, labels] = await Promise.all([getTypeList(), getTypeLabels()]);
  return list.map((t) => typeRef(labels, t.name));
});

export default component$(() => {
  const types = useTypes();
  return (
    <>
      <h1>Types</h1>
      <ul class="type-grid" role="list">
        {types.value.map((t) => (
          <li key={t.name}>
            <Link class="type-tile" style={{ "--badge-bg": `var(--type-${t.name})` }} href={`/types/${t.name}`}>
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
});

export const head: DocumentHead = { title: pageTitle("Types") };
