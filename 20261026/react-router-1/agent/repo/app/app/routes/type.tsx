import { Link } from "react-router";
import type { Route } from "./+types/type";
import { cardsForPokemon, getTypeLabels, requireJson, safeName, typeInfo } from "~/lib/api.server";
import { CardList, Count, Section, TypeLinks } from "~/components/ui";
import { englishName, humanize, pageTitle, type NamedRef } from "~/lib/format";

const RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

export async function loader({ params }: Route.LoaderArgs) {
  const type = await requireJson(`type/${safeName(params.name)}`);
  const [typeLabels, pokemon] = await Promise.all([
    getTypeLabels(),
    cardsForPokemon(type.pokemon.map((entry: any) => ({ pokemon: entry.pokemon }))),
  ]);
  const relations = RELATIONS.map(([key, label]) => ({
    label,
    types: ((type.damage_relations?.[key] ?? []) as NamedRef[]).map((t) => typeInfo(typeLabels, t.name)),
  }));
  const moves = (type.moves as NamedRef[])
    .map((move) => ({ name: move.name, label: humanize(move.name) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return { name: type.name as string, displayName: englishName(type.names, type.name), relations, pokemon, moves };
}

export default function Type({ loaderData: data }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(data.displayName)}</title>
      <h1>{data.displayName}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {data.relations.map((relation) => (
            <div key={relation.label}>
              <dt>{relation.label}</dt>
              <dd>{relation.types.length ? <TypeLinks types={relation.types} /> : "None"}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Pokémon">
        <Count n={data.pokemon.length} />
        <CardList cards={data.pokemon} />
      </Section>
      <Section title="Moves">
        <Count n={data.moves.length} noun="moves" />
        <ul className="move-columns">
          {data.moves.map((move) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
