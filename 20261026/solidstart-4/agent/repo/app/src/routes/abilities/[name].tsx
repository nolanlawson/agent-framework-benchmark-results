import { Title } from "@solidjs/meta";
import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCards from "~/components/PokemonCards";
import Section from "~/components/Section";
import { orMissing, pageTitle } from "~/lib/format";
import { getAbility } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getAbility(params.name!),
} satisfies RouteDefinition;

export default function AbilityPage() {
  const params = useParams();
  const ability = createAsync(() => getAbility(params.name!));

  return (
    <Show when={ability()} fallback={<NotFound />}>
      {(a) => (
        <>
          <Title>{pageTitle(a().label)}</Title>
          <h1>{a().label}</h1>

          <Section id="effect" title="Effect">
            <p>{orMissing(a().effect)}</p>
          </Section>

          <Section id="pokemon" title="Pokémon">
            <p class="count">{a().pokemon.length} Pokémon</p>
            <PokemonCards cards={a().pokemon} />
          </Section>
        </>
      )}
    </Show>
  );
}
