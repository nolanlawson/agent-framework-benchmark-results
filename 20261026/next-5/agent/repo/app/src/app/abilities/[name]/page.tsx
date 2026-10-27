import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiBaseUrl, apiOrNull } from '@/lib/api';
import { cardsFor } from '@/lib/cards';
import { cleanText, englishName, humanize, MISSING } from '@/lib/format';
import { Section } from '@/components/Section';
import { PokemonCardList } from '@/components/PokemonCard';

type Props = { params: Promise<{ name: string }> };

async function getAbility(name: string) {
  const ability = await apiOrNull(`ability/${encodeURIComponent(decodeURIComponent(name).toLowerCase())}`);
  if (!ability) notFound();
  return ability;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ability = await getAbility((await params).name);
  return { title: englishName(ability.names) ?? humanize(ability.name) };
}

export default async function AbilityPage({ params }: Props) {
  const ability = await getAbility((await params).name);
  const refs: { url: string; hidden: boolean }[] = (ability.pokemon ?? []).map((p: any) => ({
    url: p.pokemon.url,
    hidden: p.is_hidden,
  }));
  const cards = await cardsFor(refs, (r) => (r.hidden ? 'Hidden ability' : undefined));

  const shortEffect = ability.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect;

  return (
    <>
      <h1>{englishName(ability.names) ?? humanize(ability.name)}</h1>

      <Section id="effect" title="Effect">
        <p>{shortEffect ? cleanText(shortEffect) : MISSING}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} apiBase={apiBaseUrl()} />
      </Section>
    </>
  );
}
