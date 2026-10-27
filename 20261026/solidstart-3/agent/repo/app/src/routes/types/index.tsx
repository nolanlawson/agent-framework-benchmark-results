import { createAsync } from "@solidjs/router";
import { For } from "solid-js";
import { PageTitle } from "~/components/ui";
import { getTypes } from "~/lib/queries";

export default function TypesPage() {
  const types = createAsync(() => getTypes(), { deferStream: true });

  return (
    <>
      <PageTitle heading="Types" />
      <h1>Types</h1>
      <ul class="type-grid">
        <For each={types()}>
          {(t) => (
            <li>
              <a href={`/types/${t.name}`} style={{ "--badge-bg": `var(--type-${t.name})` }}>
                {t.label}
              </a>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
