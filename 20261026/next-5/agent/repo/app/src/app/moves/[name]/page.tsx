import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { apiBaseUrl, apiOrNull, getTypeLabels } from '@/lib/api';
import { cardsFor } from '@/lib/cards';
import { cleanText, englishName, humanize, latestEnglishFlavorText, MISSING, orMissing } from '@/lib/format';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { PokemonCardList } from '@/components/PokemonCard';

type Props = { params: Promise<{ name: string }> };

async function getMove(name: string) {
  const move = await apiOrNull(`move/${encodeURIComponent(decodeURIComponent(name).toLowerCase())}`);
  if (!move) notFound();
  return move;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const move = await getMove((await params).name);
  return { title: englishName(move.names) ?? humanize(move.name) };
}

export default async function MovePage({ params }: Props) {
  const move = await getMove((await params).name);
  const [typeLabels, cards] = await Promise.all([getTypeLabels(), cardsFor(move.learned_by_pokemon ?? [])]);

  const shortEffect = move.effect_entries?.find((e: any) => e.language.name === 'en')?.short_effect;
  const effect = shortEffect ? cleanText(shortEffect) : (latestEnglishFlavorText(move.flavor_text_entries) ?? MISSING);

  return (
    <>
      <h1>{englishName(move.names) ?? humanize(move.name)}</h1>
      <dl className="facts panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={move.type.name} label={typeLabels.get(move.type.name) ?? humanize(move.type.name)} link />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : MISSING}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orMissing(move.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orMissing(move.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orMissing(move.pp)}</dd>
        </div>
      </dl>

      <Section id="effect" title="Effect">
        <p>{effect}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} apiBase={apiBaseUrl()} />
      </Section>
    </>
  );
}
