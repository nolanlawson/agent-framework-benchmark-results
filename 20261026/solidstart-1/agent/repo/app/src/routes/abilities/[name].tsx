import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";
import { NotFound } from "~/components/NotFound";
import { PageTitle } from "~/components/PageTitle";
import { CardList } from "~/components/PokemonCard";
import { Section } from "~/components/Section";
import { display } from "~/lib/format";
import { getAbility } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getAbility(params.name!),
} satisfies RouteDefinition;

export default function AbilityPage() {
  const params = useParams();
  const ability = createAsync(() => getAbility(params.name!));

  return (
    <Show when={ability()} fallback={<Show when={ability() === null}><NotFound /></Show>}>
      {(a) => (
        <>
          <PageTitle heading={a().title} />
          <h1 class="page-title">{a().title}</h1>
          <Section id="effect" title="Effect">
            <p>{display(a().effect)}</p>
          </Section>
          <Section id="pokemon" title="Pokémon">
            <p class="count">{a().pokemon.length} Pokémon</p>
            <CardList cards={a().pokemon} />
          </Section>
        </>
      )}
    </Show>
  );
}
