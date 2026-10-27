import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { CardList, Count, NotFound, PageTitle, Section, TypeBadge } from "~/components/ui";
import { EM_DASH, orDash } from "~/lib/format";
import { getMove } from "~/lib/queries";

export default function MovePage() {
  const params = useParams<{ name: string }>();
  const move = createAsync(() => getMove(params.name), { deferStream: true });

  return (
    <Show when={move() !== undefined}>
      <Show when={move()} fallback={<NotFound />}>
        {(m) => (
          <>
            <PageTitle heading={m().label} />
            <h1>{m().label}</h1>
            <dl class="panel facts move-facts">
              <div>
                <dt>Type</dt>
                <dd>
                  <TypeBadge type={m().type} />
                </dd>
              </div>
              <div>
                <dt>Category</dt>
                <dd>{orDash(m().category)}</dd>
              </div>
              <div>
                <dt>Power</dt>
                <dd>{orDash(m().power)}</dd>
              </div>
              <div>
                <dt>Accuracy</dt>
                <dd>{orDash(m().accuracy)}</dd>
              </div>
              <div>
                <dt>PP</dt>
                <dd>{orDash(m().pp)}</dd>
              </div>
            </dl>
            <Section id="effect" title="Effect">
              <p>{m().effect ?? EM_DASH}</p>
            </Section>
            <Section id="learned-by" title="Learned by">
              <Count n={m().learnedBy.length} />
              <CardList cards={m().learnedBy} />
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
