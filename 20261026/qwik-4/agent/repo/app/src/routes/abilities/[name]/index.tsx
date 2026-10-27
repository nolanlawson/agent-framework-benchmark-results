import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { CardList } from "~/components/pokemon-card";
import { Section } from "~/components/section";
import { api, cleanText, englishName, latestEnglishFlavorText, speciesCards, type NamedRef } from "~/lib/api";
import { EM_DASH, pageTitle } from "~/lib/format";

export const useAbility = routeLoader$(async ({ params, fail }) => {
  const ability = await api(`ability/${encodeURIComponent(params.name.toLowerCase())}`);
  if (!ability || ability.name !== params.name.toLowerCase()) return fail(404, { notFound: true as const });

  const shortEffect = (ability.effect_entries as { short_effect: string; language: NamedRef }[])?.find(
    (e) => e.language.name === "en",
  )?.short_effect;

  return {
    notFound: false as const,
    name: englishName(ability.names, ability.name),
    effect: (shortEffect && cleanText(shortEffect)) || latestEnglishFlavorText(ability.flavor_text_entries) || EM_DASH,
    pokemon: await speciesCards(
      ability.pokemon as { is_hidden: boolean; pokemon: NamedRef }[],
      (entry) => ({ hidden: entry.is_hidden }),
    ),
  };
});

export default component$(() => {
  const data = useAbility();
  const a = data.value;
  if (a.notFound) return <NotFound />;

  return (
    <>
      <h1>{a.name}</h1>
      <Section id="effect" title="Effect">
        <p>{a.effect}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p class="count">{a.pokemon.length} Pokémon</p>
        <CardList cards={a.pokemon} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(useAbility);
  return { title: pageTitle(data.notFound ? "Not found" : data.name) };
};
