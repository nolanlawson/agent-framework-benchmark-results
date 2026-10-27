import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PokemonCardList } from '@/components/PokemonCard';
import { Section } from '@/components/Section';
import { TypeBadge } from '@/components/TypeBadge';
import { apiBase, getType, getTypeLabels, toSpeciesRefs, type Type } from '@/lib/api';
import { englishName, humanize } from '@/lib/format';

type Props = { params: Promise<{ name: string }> };

const RELATIONS: [keyof Type['damage_relations'], string][] = [
  ['double_damage_to', 'Super effective against'],
  ['half_damage_to', 'Not very effective against'],
  ['no_damage_to', 'No effect against'],
  ['double_damage_from', 'Weak to'],
  ['half_damage_from', 'Resists'],
  ['no_damage_from', 'Immune to'],
];

async function load(name: string) {
  const type = await getType(decodeURIComponent(name));
  if (!type) notFound();
  return type;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = await load((await params).name);
  return { title: englishName(type.names) ?? humanize(type.name) };
}

export default async function TypePage({ params }: Props) {
  const type = await load((await params).name);
  const [typeLabels, pokemon] = await Promise.all([getTypeLabels(), toSpeciesRefs(type.pokemon, (p) => p.pokemon)]);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1>{englishName(type.names) ?? humanize(type.name)}</h1>

      <Section id="damage" title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([key, term]) => {
            const related = type.damage_relations[key];
            return (
              <div key={key}>
                <dt>{term}</dt>
                <dd>
                  {related.length === 0
                    ? 'None'
                    : related.map((t) => (
                        <TypeBadge key={t.name} name={t.name} label={typeLabels.get(t.name) ?? humanize(t.name)} link small />
                      ))}
                </dd>
              </div>
            );
          })}
        </dl>
      </Section>

      <Section id="pokemon" title="Pokémon">
        <p className="count">{pokemon.length} Pokémon</p>
        <PokemonCardList apiBase={apiBase()} cards={pokemon} />
      </Section>

      <Section id="moves" title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="move-grid">
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
