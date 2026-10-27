import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PokemonCardList } from '@/components/PokemonCard';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { apiBase, getMove, getTypeLabels, moveEffect, toSpeciesRefs } from '@/lib/api';
import { EM_DASH, englishName, humanize, orDash } from '@/lib/format';

type Props = { params: Promise<{ name: string }> };

async function load(name: string) {
  const move = await getMove(decodeURIComponent(name));
  if (!move) notFound();
  return move;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const move = await load((await params).name);
  return { title: englishName(move.names) ?? humanize(move.name) };
}

export default async function MovePage({ params }: Props) {
  const move = await load((await params).name);
  const [typeLabels, learnedBy] = await Promise.all([getTypeLabels(), toSpeciesRefs(move.learned_by_pokemon, (p) => p)]);

  return (
    <>
      <h1>{englishName(move.names) ?? humanize(move.name)}</h1>
      <dl className="panel summary">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={move.type.name} label={typeLabels.get(move.type.name) ?? humanize(move.type.name)} link small />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : EM_DASH}</dd>
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
        <p>{moveEffect(move)}</p>
      </Section>

      <Section id="learned-by" title="Learned by">
        <p className="count">{learnedBy.length} Pokémon</p>
        <PokemonCardList apiBase={apiBase()} cards={learnedBy} />
      </Section>
    </>
  );
}
