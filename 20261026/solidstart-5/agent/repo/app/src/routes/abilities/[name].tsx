import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";
import { CardGrid, Count, NotFound, PageTitle, Section } from "~/components/ui";
import { getAbility } from "~/lib/data";
import { MISSING } from "~/lib/format";

export const route = {
  preload: ({ params }) => getAbility(params.name!),
} satisfies RouteDefinition;

export default function AbilityRoute() {
  const params = useParams<{ name: string }>();
  const ability = createAsync(() => getAbility(params.name));

  return (
    <Show when={ability() !== undefined}>
      <Show when={ability()} fallback={<NotFound />}>
        {(a) => (
          <>
            <PageTitle heading={a().label} />
            <h1 class="page-title">{a().label}</h1>
            <Section id="effect" title="Effect">
              <p>{a().effect ?? MISSING}</p>
            </Section>
            <Section id="pokemon" title="Pokémon">
              <Count n={a().pokemon.length} />
              <CardGrid cards={a().pokemon} />
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
