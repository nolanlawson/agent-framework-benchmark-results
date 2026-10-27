import { Link } from "react-router";
import type { Route } from "./+types/type";
import { CardList, Count, Section, TypeBadges } from "~/components/ui";
import { cardsFor, englishName, getOr404, getTypeLabels, typeRef } from "~/lib/data.server";
import { humanize, pageTitle } from "~/lib/format";

const RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

type Named = { name: string; url: string };

export async function loader({ params }: Route.LoaderArgs) {
  const type = await getOr404(`type/${encodeURIComponent(params.name.toLowerCase())}`);
  const [typeLabels, pokemon] = await Promise.all([
    getTypeLabels(),
    cardsFor(type.pokemon as { pokemon: Named }[], (p) => p.pokemon),
  ]);
  return {
    name: englishName(type),
    relations: RELATIONS.map(([key, label]) => ({
      label,
      types: ((type.damage_relations?.[key] ?? []) as Named[]).map((t) => typeRef(t.name, typeLabels)),
    })),
    pokemon,
    moves: (type.moves as Named[]).map((m) => m.name).sort((a, b) => humanize(a).localeCompare(humanize(b))),
  };
}

export default function Type({ loaderData: t }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(t.name)}</title>
      <h1>{t.name}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {t.relations.map((r) => (
            <div key={r.label}>
              <dt>{r.label}</dt>
              <dd>{r.types.length ? <TypeBadges types={r.types} /> : "None"}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Pokémon">
        <Count n={t.pokemon.length} />
        <CardList cards={t.pokemon} />
      </Section>
      <Section title="Moves">
        <Count n={t.moves.length} noun="moves" />
        <ul className="move-list">
          {t.moves.map((name) => (
            <li key={name}>
              <Link to={`/moves/${name}`}>{humanize(name)}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
