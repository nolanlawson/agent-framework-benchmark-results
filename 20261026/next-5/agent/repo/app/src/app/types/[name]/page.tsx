import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiBaseUrl, apiOrNull, getTypeLabels } from '@/lib/api';
import { cardsFor } from '@/lib/cards';
import { englishName, humanize } from '@/lib/format';
import { Section } from '@/components/Section';
import { TypeBadges } from '@/components/TypeBadge';
import { PokemonCardList } from '@/components/PokemonCard';

type Props = { params: Promise<{ name: string }> };

const RELATIONS = [
  ['Super effective against', 'double_damage_to'],
  ['Not very effective against', 'half_damage_to'],
  ['No effect against', 'no_damage_to'],
  ['Weak to', 'double_damage_from'],
  ['Resists', 'half_damage_from'],
  ['Immune to', 'no_damage_from'],
] as const;

async function getType(name: string) {
  const type = await apiOrNull(`type/${encodeURIComponent(decodeURIComponent(name).toLowerCase())}`);
  if (!type) notFound();
  return type;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = await getType((await params).name);
  return { title: englishName(type.names) ?? humanize(type.name) };
}

export default async function TypePage({ params }: Props) {
  const type = await getType((await params).name);
  const [typeLabels, cards] = await Promise.all([
    getTypeLabels(),
    cardsFor((type.pokemon ?? []).map((p: any) => p.pokemon)),
  ]);
  const label = (name: string) => typeLabels.get(name) ?? humanize(name);
  const moves = (type.moves ?? [])
    .map((m: { name: string }) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>{englishName(type.names) ?? humanize(type.name)}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([term, key]) => {
            const related: { name: string }[] = type.damage_relations?.[key] ?? [];
            return (
              <div key={key}>
                <dt>{term}</dt>
                <dd>
                  {related.length ? (
                    <TypeBadges types={related.map((t) => ({ name: t.name, label: label(t.name) }))} link />
                  ) : (
                    'None'
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCardList cards={cards} apiBase={apiBaseUrl()} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="move-columns">
          {moves.map((m: { name: string; label: string }) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`} prefetch={false}>
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
