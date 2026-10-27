import { createAsync, useParams, type RouteDefinition } from "@solidjs/router";
import { Show } from "solid-js";
import { CardGrid, Count, Facts, NotFound, PageTitle, Section, TypeBadge } from "~/components/ui";
import { getMove } from "~/lib/data";
import { MISSING, orMissing } from "~/lib/format";

export const route = {
  preload: ({ params }) => getMove(params.name!),
} satisfies RouteDefinition;

export default function MoveRoute() {
  const params = useParams<{ name: string }>();
  const move = createAsync(() => getMove(params.name));

  return (
    <Show when={move() !== undefined}>
      <Show when={move()} fallback={<NotFound />}>
        {(m) => (
          <>
            <PageTitle heading={m().label} />
            <h1 class="page-title">{m().label}</h1>
            <div class="panel facts-panel">
              <Facts
                items={[
                  ["Type", m().type ? <TypeBadge type={m().type!} link /> : MISSING],
                  ["Category", orMissing(m().category)],
                  ["Power", orMissing(m().power)],
                  ["Accuracy", orMissing(m().accuracy)],
                  ["PP", orMissing(m().pp)],
                ]}
              />
            </div>
            <Section id="effect" title="Effect">
              <p>{m().effect ?? MISSING}</p>
            </Section>
            <Section id="learned-by" title="Learned by">
              <Count n={m().learnedBy.length} />
              <CardGrid cards={m().learnedBy} />
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
