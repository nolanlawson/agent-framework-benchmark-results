import type { Route } from "./+types/ability";
import {
  cardsFromPokemon,
  englishName,
  englishShortEffect,
  getAbility,
  getSpeciesIndex,
  latestEnglishFlavorText,
} from "~/lib/api.server";
import { EM_DASH, pageTitle } from "~/lib/format";
import { CardList, Count, Section } from "~/components/ui";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? pageTitle(loaderData.name) : "Not found – Pokédex" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const ability = await getAbility(params.name);
  const species = await getSpeciesIndex();
  return {
    name: englishName(ability),
    effect:
      englishShortEffect(ability.effect_entries) ??
      latestEnglishFlavorText(ability.flavor_text_entries) ??
      EM_DASH,
    pokemon: cardsFromPokemon(
      ability.pokemon.map((p) => ({ url: p.pokemon.url, hidden: p.is_hidden })),
      species,
      (p) => ({ hidden: p.hidden }),
    ),
  };
}

export default function Ability({ loaderData: a }: Route.ComponentProps) {
  return (
    <>
      <h1 className="page-title">{a.name}</h1>
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
