import { Link, useSearchParams } from "react-router";
import type { Route } from "./+types/pokemon";
import { MoveTable } from "../components/MoveTable";
import { Section } from "../components/Section";
import { TypeLink } from "../components/TypeBadge";
import { dexNumber, humanize, MISSING, pageTitle } from "../lib/format";
import { getPokemonPage, type EvolutionNode } from "../lib/pokeapi.server";

const MAX_STAT = 255;

export async function loader({ params, url }: Route.LoaderArgs) {
  return getPokemonPage(params.name, url.searchParams.get("game"));
}

function EvolutionList({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul>
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
          {node.children.length > 0 && <EvolutionList nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}

function StatBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="stat-bar" aria-hidden="true">
      <span className="stat-bar__fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}

export default function PokemonPage({ loaderData: pokemon }: Route.ComponentProps) {
  const [, setSearchParams] = useSearchParams();
  const total = pokemon.stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      <title>{pageTitle(pokemon.label)}</title>
      <div className="summary">
        <div className="summary__artwork">
          {pokemon.artwork && <img src={pokemon.artwork} alt={pokemon.label} width={475} height={475} />}
        </div>
        <div className="summary__info">
          <p className="muted summary__number">{dexNumber(pokemon.id)}</p>
          <h1>{pokemon.label}</h1>
          {pokemon.genus && <p className="muted">{pokemon.genus}</p>}
          <p className="badges">
            {pokemon.types.map((t) => (
              <TypeLink key={t.name} type={t} />
            ))}
          </p>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{(pokemon.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(pokemon.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          <p>{pokemon.flavorText ?? MISSING}</p>
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {pokemon.stats.map((stat) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td className="stats__value">{stat.value}</td>
                <td className="stats__bar">
                  <StatBar value={stat.value} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr className="stats__total">
              <th scope="row">Total</th>
              <td className="stats__value">{total}</td>
              <td className="stats__bar">
                <StatBar value={total} max={MAX_STAT * Math.max(1, pokemon.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul>
          {pokemon.abilities.map((a) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{humanize(a.name)}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        <EvolutionList nodes={[pokemon.evolution]} />
      </Section>

      <Section title="Moves" id="moves">
        {pokemon.games.length === 0 ? (
          <p>{MISSING}</p>
        ) : (
          <>
            <div className="field field--inline">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={pokemon.game ?? ""}
                onChange={(e) =>
                  setSearchParams({ game: e.target.value }, { replace: true, preventScrollReset: true })
                }
              >
                {pokemon.games.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {pokemon.moveTables.map((table) => (
              <MoveTable key={`${pokemon.game}-${table.method}`} table={table} />
            ))}
          </>
        )}
      </Section>
    </>
  );
}
