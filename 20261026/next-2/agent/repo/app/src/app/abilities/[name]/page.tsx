import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { englishName, englishShortEffect, getAbility, toCards } from '@/lib/api';
import { DASH, humanize } from '@/lib/format';
import { Section } from '@/components/Section';
import { PokemonCards } from '@/components/PokemonCards';

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ability = await getAbility((await params).name);
  return { title: ability ? englishName(ability.names, humanize(ability.name)) : 'Not found' };
}

export default async function AbilityPage({ params }: Props) {
  const ability = await getAbility((await params).name);
  if (!ability) notFound();
  const cards = await toCards(ability.pokemon.map((p) => ({ pokemon: p.pokemon, hidden: p.is_hidden })));

  return (
    <>
      <h1 className="page-title">{englishName(ability.names, humanize(ability.name))}</h1>
      <Section id="effect" title="Effect">
        <p>{englishShortEffect(ability.effect_entries) ?? DASH}</p>
      </Section>
      <Section id="pokemon" title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCards cards={cards} />
      </Section>
    </>
  );
}
