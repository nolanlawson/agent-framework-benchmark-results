import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PokemonCards } from "@/components/PokemonCards";
import { Section } from "@/components/Section";
import { TypeBadge } from "@/components/TypeBadge";
import { find, type Type } from "@/lib/api";
import { cardsForPokemon, getTypeLabels, typeInfo } from "@/lib/data";
import { englishName, humanize, isApiName } from "@/lib/format";

type Props = { params: Promise<{ name: string }> };

const RELATIONS = [
  ["Super effective against", "double_damage_to"],
  ["Not very effective against", "half_damage_to"],
  ["No effect against", "no_damage_to"],
  ["Weak to", "double_damage_from"],
  ["Resists", "half_damage_from"],
  ["Immune to", "no_damage_from"],
] as const;

async function getType(name: string) {
  return isApiName(name) ? find<Type>(`type/${name.toLowerCase()}`) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const type = await getType((await params).name);
  return { title: type ? englishName(type.names, type.name) : "Not found" };
}

export default async function TypePage({ params }: Props) {
  const type = await getType((await params).name);
  if (!type) notFound();

  const [typeLabels, cards] = await Promise.all([getTypeLabels(), cardsForPokemon(type.pokemon)]);
  const moves = type.moves
    .map((m) => ({ name: m.name, label: humanize(m.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <h1 className="page-title">{englishName(type.names, type.name)}</h1>

      <Section title="Damage relations">
        <dl className="relations">
          {RELATIONS.map(([label, key]) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>
                {type.damage_relations[key].length === 0 ? (
                  "None"
                ) : (
                  <span className="type-list">
                    {type.damage_relations[key].map((t) => (
                      <TypeBadge key={t.name} type={typeInfo(typeLabels, t.name)} />
                    ))}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Pokémon">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCards cards={cards} />
      </Section>

      <Section title="Moves">
        <p className="count">{moves.length} moves</p>
        <ul className="move-list">
          {moves.map((m) => (
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
