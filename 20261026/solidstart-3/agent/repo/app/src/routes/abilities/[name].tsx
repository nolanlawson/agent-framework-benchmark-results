import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";
import { CardList, Count, NotFound, PageTitle, Section } from "~/components/ui";
import { EM_DASH } from "~/lib/format";
import { getAbility } from "~/lib/queries";

export default function AbilityPage() {
  const params = useParams<{ name: string }>();
  const ability = createAsync(() => getAbility(params.name), { deferStream: true });

  return (
    <Show when={ability() !== undefined}>
      <Show when={ability()} fallback={<NotFound />}>
        {(a) => (
          <>
            <PageTitle heading={a().label} />
            <h1>{a().label}</h1>
            <Section id="effect" title="Effect">
              <p>{a().effect ?? EM_DASH}</p>
            </Section>
            <Section id="pokemon" title="Pokémon">
              <Count n={a().pokemon.length} />
              <CardList cards={a().pokemon} />
            </Section>
          </>
        )}
      </Show>
    </Show>
  );
}
