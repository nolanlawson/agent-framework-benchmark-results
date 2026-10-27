import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";
import { NotFound } from "~/components/NotFound";
import { PageTitle } from "~/components/PageTitle";
import { CardList } from "~/components/PokemonCard";
import { Section } from "~/components/Section";
import { TypeBadge } from "~/components/TypeBadge";
import { display } from "~/lib/format";
import { getMove } from "~/lib/queries";

export const route = {
  preload: ({ params }) => getMove(params.name!),
} satisfies RouteDefinition;

export default function MovePage() {
  const params = useParams();
  const move = createAsync(() => getMove(params.name!));

  return (
    <Show when={move()} fallback={<Show when={move() === null}><NotFound /></Show>}>
      {(m) => (
        <>
          <PageTitle heading={m().title} />
          <h1 class="page-title">{m().title}</h1>
          <dl class="facts facts--panel">
            <div>
              <dt>Type</dt>
              <dd>{m().type ? <TypeBadge type={m().type!} /> : display(null)}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{display(m().category)}</dd>
            </div>
            <div>
              <dt>Power</dt>
              <dd>{display(m().power)}</dd>
            </div>
            <div>
              <dt>Accuracy</dt>
              <dd>{display(m().accuracy)}</dd>
            </div>
            <div>
              <dt>PP</dt>
              <dd>{display(m().pp)}</dd>
            </div>
          </dl>
          <Section id="effect" title="Effect">
            <p>{display(m().effect)}</p>
          </Section>
          <Section id="learned-by" title="Learned by">
            <p class="count">{m().learnedBy.length} Pokémon</p>
            <CardList cards={m().learnedBy} />
          </Section>
        </>
      )}
    </Show>
  );
}
