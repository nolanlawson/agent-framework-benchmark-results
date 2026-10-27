import { Link, useNavigate } from "react-router";
import type { Route } from "./+types/pokemon";
import {
  englishName,
  getEvolutionChain,
  getMoves,
  getPokemonById,
  getSpecies,
  getTypeNames,
  getVersionGroup,
  latestEnglishFlavorText,
  type ApiChainLink,
} from "~/lib/api.server";
import { dexNumber, humanize, pageTitle } from "~/lib/format";
import { Section, TypeBadge } from "~/components/ui";
import { MoveTables, type MoveRow } from "~/components/move-tables";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};
const MAX_STAT = 255;

const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

type EvolutionNode = { name: string; children: EvolutionNode[] };

function toEvolutionNode(link: ApiChainLink): EvolutionNode {
  return { name: link.species.name, children: link.evolves_to.map(toEvolutionNode) };
}

export const meta: Route.MetaFunction = ({ loaderData }) => [
  { title: loaderData ? pageTitle(loaderData.name) : "Not found – Pokédex" },
];

export async function loader({ params, request }: Route.LoaderArgs) {
  const species = await getSpecies(params.name);
  const [pokemon, chain, typeNames] = await Promise.all([
    getPokemonById(species.id),
    species.evolution_chain ? getEvolutionChain(species.evolution_chain.url) : null,
    getTypeNames(),
  ]);
  const typeLabel = (name: string) => typeNames[name] ?? humanize(name);

  // Version groups in which the Pokémon learns moves, ordered by the group's `order`.
  const groupNames = [
    ...new Set(pokemon.moves.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ];
  const groups = (await Promise.all(groupNames.map(getVersionGroup))).sort((a, b) => a.order - b.order);
  const requestedGame = new URL(request.url).searchParams.get("game");
  const game =
    groups.find((g) => g.name === requestedGame)?.name ?? groups[groups.length - 1]?.name ?? null;

  // Moves learned in the selected game, grouped by learn method.
  const learned: { move: string; method: string; level: number }[] = [];
  const seen = new Set<string>();
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      const key = `${m.move.name}|${d.move_learn_method.name}|${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      learned.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const moves = await getMoves([...new Set(learned.map((l) => l.move))]);
  const methods = [...new Set(learned.map((l) => l.method))].sort((a, b) => {
    const ia = METHOD_ORDER.indexOf(a);
    const ib = METHOD_ORDER.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
    return humanize(a).localeCompare(humanize(b));
  });
  const moveTables = methods.map((method) => ({
    method,
    label: humanize(method),
    rows: learned
      .filter((l) => l.method === method)
      .map((l): MoveRow => {
        const move = moves.get(l.move)!;
        return {
          name: move.name,
          label: englishName(move),
          level: method === "level-up" ? l.level : null,
          type: move.type.name,
          typeLabel: typeLabel(move.type.name),
          category: move.damage_class ? humanize(move.damage_class.name) : null,
          power: move.power,
          accuracy: move.accuracy,
          pp: move.pp,
        };
      }),
  }));

  const stats = pokemon.stats.map((s) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  return {
    id: species.id,
    name: englishName(species),
    genus: species.genera.find((g) => g.language.name === "en")?.genus ?? null,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    artwork: pokemon.sprites.other?.["official-artwork"]?.front_default ?? pokemon.sprites.front_default,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map((t) => ({ name: t.type.name, label: typeLabel(t.type.name) })),
    stats,
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain ? toEvolutionNode(chain.chain) : { name: species.name, children: [] },
    games: groups.map((g) => ({ value: g.name, label: humanize(g.name) })),
    game,
    moveTables,
  };
}

function EvolutionList({ nodes }: { nodes: EvolutionNode[] }) {
  return (
    <ul className="evolution">
      {nodes.map((node) => (
        <li key={node.name}>
          <Link to={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
          {node.children.length > 0 && <EvolutionList nodes={node.children} />}
        </li>
      ))}
    </ul>
  );
}

export default function Pokemon({ loaderData: p }: Route.ComponentProps) {
  const navigate = useNavigate();
  const total = p.stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      <div className="summary">
        <div className="summary__art">
          {p.artwork && <img src={p.artwork} alt={p.name} width={475} height={475} />}
        </div>
        <div className="summary__info">
          <p className="summary__dex">{dexNumber(p.id)}</p>
          <h1 className="summary__name">{p.name}</h1>
          {p.genus && <p className="summary__genus">{p.genus}</p>}
          <ul className="badge-list" aria-label="Types">
            {p.types.map((t) => (
              <li key={t.name}>
                <TypeBadge name={t.name} label={t.label} />
              </li>
            ))}
          </ul>
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{p.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{p.weight} kg</dd>
            </div>
          </dl>
          {p.flavorText && <p className="summary__flavor">{p.flavorText}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td>{s.value}</td>
                <td aria-hidden="true" className="stats__bar-cell">
                  <StatBar value={s.value} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr className="stats__total">
              <th scope="row">Total</th>
              <td>{total}</td>
              <td aria-hidden="true" className="stats__bar-cell">
                <StatBar value={total} max={MAX_STAT * Math.max(1, p.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{humanize(a.name)}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        <EvolutionList nodes={[p.evolution]} />
      </Section>

      <Section title="Moves" id="moves">
        {p.games.length > 0 ? (
          <>
            <div className="game-picker">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={p.game ?? ""}
                onChange={(e) =>
                  navigate(`?game=${encodeURIComponent(e.target.value)}`, {
                    replace: true,
                    preventScrollReset: true,
                  })
                }
              >
                {p.games.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <MoveTables key={p.game} tables={p.moveTables} />
          </>
        ) : (
          <p>This Pokémon doesn’t learn any moves.</p>
        )}
      </Section>
    </>
  );
}

function StatBar({ value, max }: { value: number; max: number }) {
  return (
    <span className="stat-bar">
      <span className="stat-bar__fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}
