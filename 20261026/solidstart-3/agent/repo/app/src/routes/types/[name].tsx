import { createAsync, useParams } from "@solidjs/router";
import { For, Show } from "solid-js";
import { CardList, Count, NotFound, PageTitle, Section, TypeBadge } from "~/components/ui";
import { getType } from "~/lib/queries";

export default function TypePage() {
  const params = useParams<{ name: string }>();
  const type = createAsync(() => getType(params.name), { deferStream: true });

  return (
    <Show when={type() !== undefined}>
      <Show when={type()} fallback={<NotFound />}>
        {(t) => (
          <>
            <PageTitle heading={t().label} />
            <h1>{t().label}</h1>
            <Section id="relations" title="Damage relations">
              <dl class="relations">
                <For each={t().relations}>
                  {(r) => (
                    <div>
                      <dt>{r.term}</dt>
                      <dd class="badges">
                        <For each={r.types} fallback={<span class="none">None</span>}>
                          {(rt) => <TypeBadge type={rt} />}
                        </For>
                      </dd>
                    </div>
                  )}
                </For>
              </dl>
            </Section>
            <Section id="pokemon" title="Pokémon">
              <Count n={t().pokemon.length} />
              <CardList cards={t().pokemon} />
            </Section>
            <Section id="moves" title="Moves">
              <Count n={t().moves.length} noun="moves" />
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
    </Show>
  );
}
