import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PokemonCardList } from '@/components/PokemonCard';
import { Section } from '@/components/Section';
import { apiBase, getAbility, toSpeciesRefs } from '@/lib/api';
import { EM_DASH, englishName, humanize, latestEnglishFlavor } from '@/lib/format';

type Props = { params: Promise<{ name: string }> };

async function load(name: string) {
  const ability = await getAbility(decodeURIComponent(name));
  if (!ability) notFound();
  return ability;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ability = await load((await params).name);
  return { title: englishName(ability.names) ?? humanize(ability.name) };
}

export default async function AbilityPage({ params }: Props) {
  const ability = await load((await params).name);
  const pokemon = await toSpeciesRefs(ability.pokemon, (p) => p.pokemon);
  const effect =
    ability.effect_entries.find((e) => e.language.name === 'en')?.short_effect?.replace(/\s+/g, ' ').trim() ||
    latestEnglishFlavor(ability.flavor_text_entries) ||
    EM_DASH;

  return (
    <>
      <h1>{englishName(ability.names) ?? humanize(ability.name)}</h1>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <PokemonCardList
          apiBase={apiBase()}
          cards={pokemon.map(({ id, name, item }) => ({ id, name, note: item.is_hidden ? 'Hidden ability' : undefined }))}
        />
      </Section>
    </>
  );
}
