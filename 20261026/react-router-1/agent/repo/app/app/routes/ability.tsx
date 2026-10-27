import type { Route } from "./+types/ability";
import { cardsForPokemon, effectText, requireJson, safeName } from "~/lib/api.server";
import { CardList, Count, Section } from "~/components/ui";
import { DASH, englishName, latestFlavorText, pageTitle } from "~/lib/format";

export async function loader({ params }: Route.LoaderArgs) {
  const ability = await requireJson(`ability/${safeName(params.name)}`);
  const pokemon = await cardsForPokemon(
    ability.pokemon.map((entry: any) => ({ pokemon: entry.pokemon, hidden: entry.is_hidden })),
  );
  return {
    displayName: englishName(ability.names, ability.name),
    effect: effectText(ability) ?? latestFlavorText(ability.flavor_text_entries) ?? DASH,
    pokemon,
  };
}

export default function Ability({ loaderData: data }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(data.displayName)}</title>
      <h1>{data.displayName}</h1>
      <Section title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section title="Pokémon">
        <Count n={data.pokemon.length} />
        <CardList cards={data.pokemon} />
      </Section>
    </>
  );
}
