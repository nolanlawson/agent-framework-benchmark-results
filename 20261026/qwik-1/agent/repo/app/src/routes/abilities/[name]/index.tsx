import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList, NotFound, Section } from "~/components/ui";
import { abilityData } from "~/lib/details";
import { pageTitle } from "~/lib/format";

export const useAbility = routeLoader$(async ({ params, status }) => {
  const data = await abilityData(params.name);
  if (!data) status(404);
  return data;
});

export default component$(() => {
  const a = useAbility().value;
  if (!a) return <NotFound />;
  return (
    <>
      <h1>{a.title}</h1>
      <Section id="effect" title="Effect">
        <p>{a.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="muted count">{a.cards.length} Pokémon</p>
        <CardList cards={a.cards} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const a = resolveValue(useAbility);
  return { title: pageTitle(a ? a.title : "Not found") };
};
