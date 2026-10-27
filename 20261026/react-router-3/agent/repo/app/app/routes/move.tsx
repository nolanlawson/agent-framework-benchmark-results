import type { Route } from "./+types/move";
import { CardList, Count, Section, TypeBadge } from "~/components/ui";
import { cardsFor, english, englishName, getOr404, getTypeLabels, latestEnglishFlavorText, typeRef } from "~/lib/data.server";
import { EM_DASH, humanize, orDash, pageTitle } from "~/lib/format";

export async function loader({ params }: Route.LoaderArgs) {
  const move = await getOr404(`move/${encodeURIComponent(params.name.toLowerCase())}`);
  const [typeLabels, learnedBy] = await Promise.all([
    getTypeLabels(),
    cardsFor(move.learned_by_pokemon as { name: string; url: string }[], (p) => p),
  ]);
  const shortEffect = english(move.effect_entries as { short_effect: string; language: { name: string } }[])
    ?.short_effect?.replaceAll("$effect_chance", String(move.effect_chance ?? ""));
  return {
    name: englishName(move),
    type: move.type ? typeRef(move.type.name, typeLabels) : null,
    category: move.damage_class ? humanize(move.damage_class.name) : null,
    power: move.power as number | null,
    accuracy: move.accuracy as number | null,
    pp: move.pp as number | null,
    effect: shortEffect || latestEnglishFlavorText(move.flavor_text_entries) || EM_DASH,
    learnedBy,
  };
}

export default function Move({ loaderData: m }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(m.name)}</title>
      <h1>{m.name}</h1>
      <dl className="panel facts move-facts">
        <div>
          <dt>Type</dt>
          <dd>{m.type ? <TypeBadge type={m.type} /> : EM_DASH}</dd>
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
