import { Link } from "react-router";
import type { Route } from "./+types/type";
import { CardList } from "../components/PokemonCard";
import { Section } from "../components/Section";
import { TypeLink } from "../components/TypeBadge";
import { pageTitle } from "../lib/format";
import { getTypePage } from "../lib/pokeapi.server";

export async function loader({ params }: Route.LoaderArgs) {
  return getTypePage(params.name);
}

export default function TypePage({ loaderData: type }: Route.ComponentProps) {
  return (
    <>
      <title>{pageTitle(type.label)}</title>
      <h1>{type.label}</h1>
      <Section title="Damage relations">
        <dl className="relations">
          {type.relations.map((relation) => (
            <div key={relation.label}>
              <dt>{relation.label}</dt>
              <dd className="badges">
                {relation.types.length === 0
                  ? "None"
                  : relation.types.map((t) => <TypeLink key={t.name} type={t} />)}
              </dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Pokémon">
        <p className="count">{type.pokemon.length} Pokémon</p>
        <CardList cards={type.pokemon} />
      </Section>
      <Section title="Moves">
        <p className="count">{type.moves.length} moves</p>
        <ul className="link-columns">
          {type.moves.map((move) => (
            <li key={move.name}>
              <Link to={`/moves/${move.name}`}>{move.label}</Link>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
