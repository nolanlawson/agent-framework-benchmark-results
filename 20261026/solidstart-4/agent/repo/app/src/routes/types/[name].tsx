import { Title } from "@solidjs/meta";
import { A, createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCards from "~/components/PokemonCards";
import Section from "~/components/Section";
import TypeBadge from "~/components/TypeBadge";
import { pageTitle } from "~/lib/format";
import { getType } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getType(params.name!),
} satisfies RouteDefinition;

export default function TypePage() {
  const params = useParams();
  const type = createAsync(() => getType(params.name!));

  return (
    <Show when={type()} fallback={<NotFound />}>
      {(t) => (
        <>
          <Title>{pageTitle(t().label)}</Title>
          <h1>{t().label}</h1>

          <Section id="damage-relations" title="Damage relations">
            <dl class="relations">
              <For each={t().relations}>
                {(relation) => (
                  <div>
                    <dt>{relation.term}</dt>
                    <dd>
                      <Show when={relation.types.length} fallback="None">
                        <span class="type-list">
                          <For each={relation.types}>{(related) => <TypeBadge type={related} />}</For>
                        </span>
                      </Show>
                    </dd>
                  </div>
                )}
              </For>
            </dl>
          </Section>

          <Section id="pokemon" title="Pokémon">
            <p class="count">{t().pokemon.length} Pokémon</p>
            <PokemonCards cards={t().pokemon} />
          </Section>

          <Section id="moves" title="Moves">
            <p class="count">{t().moves.length} moves</p>
            <ul class="move-columns">
              <For each={t().moves}>
                {(move) => (
                  <li>
                    <A href={`/moves/${move.name}`}>{move.label}</A>
                  </li>
                )}
              </For>
            </ul>
          </Section>
        </>
      )}
    </Show>
  );
}
