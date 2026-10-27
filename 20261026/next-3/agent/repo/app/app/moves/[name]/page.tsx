import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PokemonCards } from "@/components/PokemonCards";
import { Section } from "@/components/Section";
import { TypeBadge } from "@/components/TypeBadge";
import { find, type Move } from "@/lib/api";
import { cardsForPokemon, getTypeLabels, typeInfo } from "@/lib/data";
import { english, englishName, humanize, isApiName, latestFlavorText, orMissing } from "@/lib/format";

type Props = { params: Promise<{ name: string }> };

async function getMove(name: string) {
  return isApiName(name) ? find<Move>(`move/${name.toLowerCase()}`) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const move = await getMove((await params).name);
  return { title: move ? englishName(move.names, move.name) : "Not found" };
}

export default async function MovePage({ params }: Props) {
  const move = await getMove((await params).name);
  if (!move) notFound();

  const [typeLabels, cards] = await Promise.all([
    getTypeLabels(),
    cardsForPokemon(move.learned_by_pokemon.map((pokemon) => ({ pokemon }))),
  ]);
  const effect =
    english(move.effect_entries)?.short_effect ?? latestFlavorText(move.flavor_text_entries) ?? "—";

  return (
    <>
      <h1 className="page-title">{englishName(move.names, move.name)}</h1>
      <dl className="facts facts--panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge type={typeInfo(typeLabels, move.type.name)} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{move.damage_class ? humanize(move.damage_class.name) : "—"}</dd>
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

      <Section title="Effect">
        <p>{effect}</p>
      </Section>

      <Section title="Learned by">
        <p className="count">{cards.length} Pokémon</p>
        <PokemonCards cards={cards} />
      </Section>
    </>
  );
}
