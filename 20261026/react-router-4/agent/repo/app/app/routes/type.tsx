import { Link } from "react-router";
import type { Route } from "./+types/type";
import { cardsFromPokemon, englishName, getSpeciesIndex, getType, getTypeNames } from "~/lib/api.server";
import { humanize, pageTitle } from "~/lib/format";
import { CardList, Count, Section, TypeBadge } from "~/components/ui";

const RELATIONS = [
  ["double_damage_to", "Super effective against"],
  ["half_damage_to", "Not very effective against"],
  ["no_damage_to", "No effect against"],
  ["double_damage_from", "Weak to"],
  ["half_damage_from", "Resists"],
  ["no_damage_from", "Immune to"],
] as const;

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? pageTitle(loaderData.name) : "Not found – Pokédex" },
];

export async function loader({ params }: Route.LoaderArgs) {
  const type = await getType(params.name);
  const [species, typeNames] = await Promise.all([getSpeciesIndex(), getTypeNames()]);
  const label = (name: string) => typeNames[name] ?? humanize(name);
  return {
    name: englishName(type),
    relations: RELATIONS.map(([key, term]) => ({
      term,
      types: type.damage_relations[key].map((t) => ({ name: t.name, label: label(t.name) })),
    })),
    pokemon: cardsFromPokemon(
      type.pokemon.map((p) => p.pokemon),
      species,
    ),
    moves: type.moves
      .map((m) => ({ name: m.name, label: humanize(m.name) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  };
}

export default function Type({ loaderData: t }: Route.ComponentProps) {
  return (
    <>
      <h1 className="page-title">{t.name}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {t.relations.map((r) => (
            <div key={r.term}>
              <dt>{r.term}</dt>
              <dd>
                {r.types.length === 0 ? (
                  "None"
                ) : (
                  <ul className="badge-list">
                    {r.types.map((rt) => (
                      <li key={rt.name}>
                        <TypeBadge name={rt.name} label={rt.label} />
                      </li>
                    ))}
                  </ul>
                )}
              </dd>
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
        <ul className="move-columns">
          {t.moves.map((m) => (
            <li key={m.name}>
              <Link to={`/moves/${m.name}`}>{m.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
