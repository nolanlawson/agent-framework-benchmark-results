import type { Route } from "./+types/ability";
import { CardList } from "../components/PokemonCard";
import { Section } from "../components/Section";
import { MISSING, pageTitle } from "../lib/format";
import { getAbilityPage } from "../lib/pokeapi.server";

export async function loader({ params }: Route.LoaderArgs) {
  return getAbilityPage(params.name);
}

export default function AbilityPage({ loaderData: ability }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(ability.label)}</title>
      <h1>{ability.label}</h1>
      <Section title="Effect">
        <p>{ability.effect ?? MISSING}</p>
      </Section>
      <Section title="Pokémon">
        <p className="count">{ability.pokemon.length} Pokémon</p>
        <CardList cards={ability.pokemon} />
      </Section>
    </>
  );
}
