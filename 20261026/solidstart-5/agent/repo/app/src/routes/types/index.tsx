import { createAsync, type RouteDefinition } from "@solidjs/router";
import { For } from "solid-js";
import { PageTitle } from "~/components/ui";
import { getTypes } from "~/lib/data";

export const route = {
  preload: () => getTypes(),
} satisfies RouteDefinition;

export default function TypesRoute() {
  const types = createAsync(() => getTypes());

  return (
    <>
      <PageTitle heading="Types" />
      <h1 class="page-title">Types</h1>
      <ul class="type-grid">
        <For each={types()}>
          {(t) => (
            <li>
              <a class={`type-tile type-badge--${t.name}`} href={`/types/${t.name}`}>
                {t.label}
              </a>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
