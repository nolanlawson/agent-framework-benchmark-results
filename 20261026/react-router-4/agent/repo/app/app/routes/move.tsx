import type { Route } from "./+types/move";
import {
  cardsFromPokemon,
  englishName,
  englishShortEffect,
  getMove,
  getSpeciesIndex,
  getTypeNames,
  latestEnglishFlavorText,
} from "~/lib/api.server";
import { EM_DASH, humanize, orDash, pageTitle } from "~/lib/format";
import { CardList, Count, Section, TypeBadge } from "~/components/ui";

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? pageTitle(loaderData.name) : "Not found – Pokédex" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const move = await getMove(params.name);
  const [species, typeNames] = await Promise.all([getSpeciesIndex(), getTypeNames()]);
  return {
    name: englishName(move),
    type: { name: move.type.name, label: typeNames[move.type.name] ?? humanize(move.type.name) },
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power,
    accuracy: move.accuracy,
    pp: move.pp,
    effect:
      englishShortEffect(move.effect_entries) ?? latestEnglishFlavorText(move.flavor_text_entries) ?? EM_DASH,
    learnedBy: cardsFromPokemon(move.learned_by_pokemon, species),
  };
}

export default function Move({ loaderData: m }: Route.ComponentProps) {
  return (
    <>
      <h1 className="page-title">{m.name}</h1>
      <dl className="facts panel">
        <div>
          <dt>Type</dt>
          <dd>
            <TypeBadge name={m.type.name} label={m.type.label} />
          </dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orDash(m.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(m.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(m.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(m.pp)}</dd>
        </div>
      </dl>
      <Section title="Effect">
        <p>{m.effect}</p>
      </Section>
      <Section title="Learned by">
        <Count n={m.learnedBy.length} />
        <CardList cards={m.learnedBy} />
      </Section>
    </>
  );
}
