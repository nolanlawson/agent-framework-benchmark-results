import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { CardList } from "~/components/cards";
import { NotFound } from "~/components/not-found";
import { Section } from "~/components/section";
import { EM_DASH, pageTitle } from "~/lib/format";
import { api, cardsFor, english, englishName, latestFlavorText, slug } from "~/lib/server-api";

export const useAbility = routeLoader$(async ({ params, status }) => {
  const ability = await api(`ability/${slug(params.name)}`);
  if (!ability) {
    status(404);
    return null;
  }
  const cards = await cardsFor(
    (ability.pokemon ?? []).map((p: any) => ({ url: p.pokemon.url, hidden: !!p.is_hidden })),
  );
  return {
    label: englishName(ability),
    effect:
      english(ability.effect_entries as { short_effect: string; language: { name: string } }[])
        ?.short_effect ||
      latestFlavorText(ability.flavor_text_entries) ||
      EM_DASH,
    cards,
  };
});

export default component$(() => {
  const data = useAbility();
  const a = data.value;
  if (!a) return <NotFound />;

  return (
    <>
      <h1>{a.label}</h1>
      <Section id="effect" title="Effect">
        <p>{a.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{a.cards.length} Pokémon</p>
        <CardList cards={a.cards} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const a = resolveValue(useAbility);
  return { title: pageTitle(a ? a.label : "Not found") };
};
