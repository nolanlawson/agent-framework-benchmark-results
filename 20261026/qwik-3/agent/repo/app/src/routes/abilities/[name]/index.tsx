import { component$ } from "@builder.io/qwik";
import { routeLoader$, type DocumentHead } from "@builder.io/qwik-city";
import { NotFound } from "~/components/not-found";
import { PokemonCards } from "~/components/pokemon-cards";
import { Section } from "~/components/section";
import { api, cardsForPokemon } from "~/lib/api";
import { EM_DASH, cleanText, englishEntry, englishName, latestFlavorText, title } from "~/lib/format";

export const useAbility = routeLoader$(async ({ params, status }) => {
  const ability = await api(`ability/${encodeURIComponent(params.name.toLowerCase())}`);
  if (!ability) {
    status(404);
    return null;
  }
  const shortEffect = englishEntry<any>(ability.effect_entries)?.short_effect as string | undefined;
  return {
    label: englishName(ability),
    effect: shortEffect ? cleanText(shortEffect) : latestFlavorText(ability.flavor_text_entries) ?? EM_DASH,
    cards: await cardsForPokemon(ability.pokemon ?? [], (ref: any) => ({ hidden: Boolean(ref.is_hidden) })),
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
        <p class="muted count">{a.cards.length} Pokémon</p>
        <PokemonCards cards={a.cards} />
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const a = resolveValue(useAbility);
  return { title: title(a ? a.label : "Not found") };
};
