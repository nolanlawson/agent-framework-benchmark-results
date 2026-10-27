import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  englishName,
  englishShortEffect,
  getMove,
  getTypeNames,
  latestEnglishFlavorText,
  toCards,
} from '@/lib/api';
import { DASH, humanize, orDash } from '@/lib/format';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { PokemonCards } from '@/components/PokemonCards';

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const move = await getMove((await params).name);
  return { title: move ? englishName(move.names, humanize(move.name)) : 'Not found' };
}

export default async function MovePage({ params }: Props) {
  const move = await getMove((await params).name);
  if (!move) notFound();
  const [typeNames, cards] = await Promise.all([
    getTypeNames(),
    toCards(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  const effect = englishShortEffect(move.effect_entries) ?? latestEnglishFlavorText(move.flavor_text_entries) ?? DASH;

  return (
    <>
      <h1 className="page-title">{englishName(move.names, humanize(move.name))}</h1>
      <dl className="facts panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge type={move.type.name} label={typeNames[move.type.name] ?? humanize(move.type.name)} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : DASH}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(move.pp)}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCards cards={cards} />
      </Section>
    </>
  );
}
