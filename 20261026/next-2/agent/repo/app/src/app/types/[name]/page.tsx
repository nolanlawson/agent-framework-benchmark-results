import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { englishName, getType, getTypeNames, toCards, type Type } from '@/lib/api';
import { humanize } from '@/lib/format';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { PokemonCards } from '@/components/PokemonCards';

type Props = { params: Promise<{ name: string }> };

const RELATIONS: [keyof Type['damage_relations'], string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = await getType((await params).name);
  return { title: type ? englishName(type.names, humanize(type.name)) : 'Not found' };
}

export default async function TypePage({ params }: Props) {
  const type = await getType((await params).name);
  if (!type) notFound();
  const [typeNames, cards] = await Promise.all([
    getTypeNames(),
    toCards(type.pokemon.map((p) => ({ pokemon: p.pokemon }))),
  ]);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1 className="page-title">{englishName(type.names, humanize(type.name))}</h1>

      <Section id="damage-relations" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([key, label]) => {
            const related = type.damage_relations[key] ?? [];
            return (
              <div key={key}>
                <dt>{label}</dt>
                <dd>
                  {related.length === 0
                    ? 'None'
                    : related.map((r) => (
                        <TypeBadge key={r.name} type={r.name} label={typeNames[r.name] ?? humanize(r.name)} />
                      ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCards cards={cards} />
      </Section>

      <Section id="type-moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="move-columns">
          {moves.map((m) => (
            <li key={m.name}>
              <Link href={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
