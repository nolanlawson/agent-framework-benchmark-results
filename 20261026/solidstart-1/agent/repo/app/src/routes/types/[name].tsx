import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { For, Show } from "solid-js";
import { NotFound } from "~/components/NotFound";
import { PageTitle } from "~/components/PageTitle";
import { CardList } from "~/components/PokemonCard";
import { Section } from "~/components/Section";
import { TypeBadge } from "~/components/TypeBadge";
import { getType } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getType(params.name!),
} satisfies RouteDefinition;

export default function TypePage() {
  const params = useParams();
  const type = createAsync(() => getType(params.name!));

  return (
    <Show when={type()} fallback={<Show when={type() === null}><NotFound /></Show>}>
      {(t) => (
        <>
          <PageTitle heading={t().title} />
          <h1 class="page-title">{t().title}</h1>
          <Section id="damage-relations" title="Damage relations">
            <dl class="relations">
              <For each={t().relations}>
                {(relation) => (
                  <div>
                    <dt>{relation.label}</dt>
                    <dd>
                      <Show when={relation.types.length} fallback="None">
                        <span class="type-badges">
                          <For each={relation.types}>{(rt) => <TypeBadge type={rt} />}</For>
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
            <CardList cards={t().pokemon} />
          </Section>
          <Section id="moves" title="Moves">
            <p class="count">{t().moves.length} moves</p>
            <ul class="move-columns">
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
  );
}
