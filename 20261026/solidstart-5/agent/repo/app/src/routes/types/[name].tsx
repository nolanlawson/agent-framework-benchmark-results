import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { CardGrid, Count, NotFound, PageTitle, Section, TypeBadges } from "~/components/ui";
import { getType } from "~/lib/data";

export const route = {
  preload: ({ params }) => getType(params.name!),
} satisfies RouteDefinition;

export default function TypeRoute() {
  const params = useParams<{ name: string }>();
  const type = createAsync(() => getType(params.name));

  return (
    <Show when={type() !== undefined}>
      <Show when={type()} fallback={<NotFound />}>
        {(t) => (
          <>
            <PageTitle heading={t().label} />
            <h1 class="page-title">{t().label}</h1>
            <Section id="relations" title="Damage relations">
              <dl class="relations">
                <For each={t().relations}>
                  {(r) => (
                    <div class="relations__item">
                      <dt>{r.label}</dt>
                      <dd>
                        <Show when={r.types.length} fallback="None">
                          <TypeBadges types={r.types} link />
                        </Show>
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
            </Section>
            <Section id="pokemon" title="Pokémon">
              <Count n={t().pokemon.length} />
              <CardGrid cards={t().pokemon} />
            </Section>
            <Section id="moves" title="Moves">
              <Count n={t().moves.length} noun="moves" />
              <ul class="move-list">
                <For each={t().moves}>
                  {(m) => (
                    <li>
                      <a href={`/moves/${m.name}`}>{m.label}</a>
                    </li>
                  )}
                </For>
              </ul>
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
