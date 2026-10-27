import type { Route } from "./+types/ability";
import { CardList, Count, Section } from "~/components/ui";
import { cardsFor, english, englishName, getOr404, latestEnglishFlavorText } from "~/lib/data.server";
import { EM_DASH, pageTitle } from "~/lib/format";

type AbilityPokemon = { is_hidden: boolean; pokemon: { name: string; url: string } };

export async function loader({ params }: Route.LoaderArgs) {
  const ability = await getOr404(`ability/${encodeURIComponent(params.name.toLowerCase())}`);
  const pokemon = await cardsFor(
    ability.pokemon as AbilityPokemon[],
    (p) => p.pokemon,
    (p) => ({ hidden: p.is_hidden }),
  );
  return {
    name: englishName(ability),
    effect:
      english(ability.effect_entries as { short_effect: string; language: { name: string } }[])?.short_effect ||
      latestEnglishFlavorText(ability.flavor_text_entries) ||
      EM_DASH,
    pokemon,
  };
}

export default function Ability({ loaderData: a }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(a.name)}</title>
      <h1>{a.name}</h1>
      <Section title="Effect">
        <p>{a.effect}</p>
      </Section>
      <Section title="Pokémon">
        <Count n={a.pokemon.length} />
        <CardList cards={a.pokemon} />
      </Section>
    </>
  );
}
