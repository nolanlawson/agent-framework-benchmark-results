import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PokemonCards } from "@/components/PokemonCards";
import { Section } from "@/components/Section";
import { find, type Ability } from "@/lib/api";
import { cardsForPokemon } from "@/lib/data";
import { english, englishName, isApiName, latestFlavorText } from "@/lib/format";

type Props = { params: Promise<{ name: string }> };

async function getAbility(name: string) {
  return isApiName(name) ? find<Ability>(`ability/${name.toLowerCase()}`) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ability = await getAbility((await params).name);
  return { title: ability ? englishName(ability.names, ability.name) : "Not found" };
}

export default async function AbilityPage({ params }: Props) {
  const ability = await getAbility((await params).name);
  if (!ability) notFound();

  const cards = await cardsForPokemon(ability.pokemon, (entry) =>
    entry.is_hidden ? { note: "Hidden ability" } : {},
  );
  const effect =
    english(ability.effect_entries)?.short_effect ?? latestFlavorText(ability.flavor_text_entries) ?? "—";

  return (
    <>
      <h1 className="page-title">{englishName(ability.names, ability.name)}</h1>

      <Section title="Effect">
        <p>{effect}</p>
      </Section>

      <Section title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCards cards={cards} />
      </Section>
    </>
  );
}
