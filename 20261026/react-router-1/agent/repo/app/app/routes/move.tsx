import type { Route } from "./+types/move";
import { cardsForPokemon, effectText, getTypeLabels, requireJson, safeName, typeInfo } from "~/lib/api.server";
import { CardList, Count, Section, TypeBadge } from "~/components/ui";
import { DASH, englishName, humanize, latestFlavorText, orDash, pageTitle } from "~/lib/format";

export async function loader({ params }: Route.LoaderArgs) {
  const move = await requireJson(`move/${safeName(params.name)}`);
  const [typeLabels, learnedBy] = await Promise.all([
    getTypeLabels(),
    cardsForPokemon(move.learned_by_pokemon.map((pokemon: any) => ({ pokemon }))),
  ]);
  return {
    displayName: englishName(move.names, move.name),
    type: move.type ? typeInfo(typeLabels, move.type.name) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect: effectText(move) ?? latestFlavorText(move.flavor_text_entries) ?? DASH,
    learnedBy,
  };
}

export default function Move({ loaderData: data }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(data.displayName)}</title>
      <h1>{data.displayName}</h1>
      <dl className="panel facts facts--panel">
        <div>
          <dt>Type</dt>
          <dd>{data.type ? <TypeBadge type={data.type} /> : DASH}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{orDash(data.category)}</dd>
        </div>
        <div>
          <dt>Power</dt>
          <dd>{orDash(data.power)}</dd>
        </div>
        <div>
          <dt>Accuracy</dt>
          <dd>{orDash(data.accuracy)}</dd>
        </div>
        <div>
          <dt>PP</dt>
          <dd>{orDash(data.pp)}</dd>
        </div>
      </dl>
      <Section title="Effect">
        <p>{data.effect}</p>
      </Section>
      <Section title="Learned by">
        <Count n={data.learnedBy.length} />
        <CardList cards={data.learnedBy} />
      </Section>
    </>
  );
}
