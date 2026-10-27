import { Title } from "@solidjs/meta";
import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";
import NotFound from "~/components/NotFound";
import PokemonCards from "~/components/PokemonCards";
import Section from "~/components/Section";
import TypeBadge from "~/components/TypeBadge";
import { orMissing, pageTitle } from "~/lib/format";
import { getMove } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getMove(params.name!),
} satisfies RouteDefinition;

export default function MovePage() {
  const params = useParams();
  const move = createAsync(() => getMove(params.name!));

  return (
    <Show when={move()} fallback={<NotFound />}>
      {(m) => (
        <>
          <Title>{pageTitle(m().label)}</Title>
          <h1>{m().label}</h1>
          <dl class="panel facts move-facts">
            <div>
              <dt>Type</dt>
              <dd>{m().type ? <TypeBadge type={m().type!} /> : orMissing(null)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{orMissing(m().category)}</dd>
            </div>
            <div>
              <dt>Power</dt>
              <dd>{orMissing(m().power)}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{orMissing(m().accuracy)}</dd>
            </div>
            <div>
              <dt>PP</dt>
              <dd>{orMissing(m().pp)}</dd>
            </div>
          </dl>

          <Section id="effect" title="Effect">
            <p>{orMissing(m().effect)}</p>
          </Section>

          <Section id="learned-by" title="Learned by">
            <p class="count">{m().learnedBy.length} Pokémon</p>
            <PokemonCards cards={m().learnedBy} />
          </Section>
        </>
      )}
    </Show>
  );
}
