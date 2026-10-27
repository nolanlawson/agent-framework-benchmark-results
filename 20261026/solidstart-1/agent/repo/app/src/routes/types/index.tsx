import { createAsync, type RouteDefinition } from "@solidjs/router";
import { For } from "solid-js";
import { PageTitle } from "~/components/PageTitle";
import { getTypeList } from "~/lib/queries";

export const route = {
  preload: () => getTypeList(),
} satisfies RouteDefinition;

export default function TypesPage() {
  const types = createAsync(() => getTypeList());
  return (
    <>
      <PageTitle heading="Types" />
      <h1 class="page-title">Types</h1>
      <ul class="type-grid">
        <For each={types()}>
          {(t) => (
            <li>
              <a class="type-tile" href={`/types/${t.name}`} style={{ "--badge-bg": `var(--type-${t.name})` }}>
                {t.label}
              </a>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
