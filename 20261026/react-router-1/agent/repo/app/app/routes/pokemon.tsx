import { Link, useLocation, useNavigate, useNavigation } from "react-router";
import type { Route } from "./+types/pokemon";
import { getJson, getTypeLabels, requireJson, safeName, typeInfo, type TypeInfo } from "~/lib/api.server";
import { MovesTable, type MoveRow } from "~/components/moves-table";
import { Section, TypeLinks } from "~/components/ui";
import { dexNumber, english, englishName, humanize, idFromUrl, latestFlavorText, pageTitle, type NamedRef } from "~/lib/format";

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

function toEvolutionNode(link: { species: NamedRef; evolves_to: any[] }): EvolutionNode {
  return { name: link.species.name, children: link.evolves_to.map(toEvolutionNode) };
}

function methodRank(method: string): [number, string] {
  const index = METHOD_ORDER.indexOf(method);
  return [index === -1 ? METHOD_ORDER.length : index, method];
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const name = safeName(params.name);
  const species = await requireJson(`pokemon-species/${name}`);
  const variety = species.varieties.find((v: any) => v.is_default) ?? species.varieties[0];
  const pokemonId = variety ? idFromUrl(variety.pokemon.url) : species.id;

  const [pokemon, chain, typeLabels] = await Promise.all([
    requireJson(`pokemon/${pokemonId}`),
    species.evolution_chain ? getJson(species.evolution_chain.url) : null,
    getTypeLabels(),
  ]);

  // Version groups in which this Pokémon learns moves, in game order.
  const versionGroupNames = [
    ...new Set<string>(
      pokemon.moves.flatMap((m: any) => m.version_group_details.map((d: any) => d.version_group.name)),
    ),
  ];
  const versionGroups = (
    await Promise.all(
      versionGroupNames.map(async (vg) => {
        const record = await getJson(`version-group/${vg}`);
        return { name: vg, label: humanize(vg), order: record?.order ?? Number.MAX_SAFE_INTEGER };
      }),
    )
  ).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  const requestedGame = new URL(request.url).searchParams.get("game");
  const game =
    versionGroups.find((vg) => vg.name === requestedGame)?.name ?? versionGroups[versionGroups.length - 1]?.name;

  // Moves learned in the selected game, grouped by learn method.
  const learned: { move: NamedRef; method: string; level: number }[] = [];
  for (const entry of pokemon.moves) {
    for (const detail of entry.version_group_details) {
      if (detail.version_group.name !== game) continue;
      learned.push({ move: entry.move, method: detail.move_learn_method.name, level: detail.level_learned_at });
    }
  }
  const moveRecords = new Map<string, any>();
  await Promise.all(
    [...new Set(learned.map((l) => l.move.name))].map(async (moveName) => {
      moveRecords.set(moveName, await getJson(`move/${moveName}`));
    }),
  );

  const byMethod = new Map<string, MoveRow[]>();
  const seen = new Set<string>();
  for (const { move, method, level } of learned) {
    const key = `${method}|${move.name}|${method === "level-up" ? level : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const record = moveRecords.get(move.name);
    const rows = byMethod.get(method) ?? [];
    rows.push({
      key,
      level: method === "level-up" ? level : null,
      name: move.name,
      label: record ? englishName(record.names, move.name) : humanize(move.name),
      type: record ? typeInfo(typeLabels, record.type.name) : null,
      category: record?.damage_class ? humanize(record.damage_class.name) : null,
      power: record?.power ?? null,
      accuracy: record?.accuracy ?? null,
      pp: record?.pp ?? null,
    });
    byMethod.set(method, rows);
  }
  const methods = [...byMethod.keys()]
    .sort((a, b) => {
      const [ra, na] = methodRank(a);
      const [rb, nb] = methodRank(b);
      return ra - rb || na.localeCompare(nb);
    })
    .map((method) => ({ method, label: humanize(method), rows: byMethod.get(method)! }));

  const types: TypeInfo[] = [...pokemon.types]
    .sort((a: any, b: any) => a.slot - b.slot)
    .map((t: any) => typeInfo(typeLabels, t.type.name));

  const stats: { name: string; label: string; value: number }[] = pokemon.stats.map((s: any) => ({
    name: s.stat.name as string,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    id: species.id as number,
    name: species.name as string,
    displayName: englishName(species.names, species.name),
    genus: english<{ genus: string; language: { name: string } }>(species.genera)?.genus,
    flavorText: latestFlavorText(species.flavor_text_entries),
    artwork: (pokemon.sprites?.other?.["official-artwork"]?.front_default as string | null) ?? null,
    height: pokemon.height as number,
    weight: pokemon.weight as number,
    types,
    stats,
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name as string, hidden: Boolean(a.is_hidden) })),
    evolution: chain ? toEvolutionNode(chain.chain) : { name: species.name, children: [] },
    versionGroups: versionGroups.map(({ name, label }) => ({ name, label })),
    game,
    methods,
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

export default function Pokemon({ loaderData }: Route.ComponentProps) {
  const data = loaderData;
  const navigate = useNavigate();
  const location = useLocation();
  const navigation = useNavigation();
  // While another game's moves load, keep the select on the chosen game.
  const pendingGame =
    navigation.location?.pathname === location.pathname
      ? new URLSearchParams(navigation.location.search).get("game")
      : null;
  const total = data.stats.reduce((sum, s) => sum + s.value, 0);
  const maxTotal = MAX_STAT * Math.max(1, data.stats.length);

  return (
    <>
      <title>{pageTitle(data.displayName)}</title>
      <div className="pokemon-summary">
        <div className="pokemon-summary__art">
          {data.artwork && <img src={data.artwork} alt={data.displayName} width={475} height={475} />}
        </div>
        <div className="pokemon-summary__info">
          <p className="dex">{dexNumber(data.id)}</p>
          <h1>{data.displayName}</h1>
          {data.genus && <p className="genus">{data.genus}</p>}
          <TypeLinks types={data.types} />
          <dl className="facts">
            <div>
              <dt>Height</dt>
              <dd>{(data.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(data.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {data.flavorText && <p className="flavor">{data.flavorText}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {data.stats.map((stat) => (
              <tr key={stat.name}>
                <th scope="row">{stat.label}</th>
                <td className="stats__value">{stat.value}</td>
                <td className="stats__bar" aria-hidden="true">
                  <span className="stat-bar">
                    <span style={{ width: `${Math.min(100, (stat.value / MAX_STAT) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stats__total">
              <th scope="row">Total</th>
              <td className="stats__value">{total}</td>
              <td className="stats__bar" aria-hidden="true">
                <span className="stat-bar">
                  <span style={{ width: `${Math.min(100, (total / maxTotal) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="plain-list">
          {data.abilities.map((ability) => (
            <li key={ability.name}>
              <Link to={`/abilities/${ability.name}`}>{humanize(ability.name)}</Link>
              {ability.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        <EvolutionList nodes={[data.evolution]} />
      </Section>

      <Section title="Moves" id="moves" className="moves">
        {data.versionGroups.length === 0 ? (
          <p>This Pokémon doesn't learn any moves.</p>
        ) : (
          <>
            <div className="field field--inline">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                value={pendingGame ?? data.game}
                onChange={(event) =>
                  navigate(`?game=${encodeURIComponent(event.currentTarget.value)}#moves`, {
                    replace: true,
                    preventScrollReset: true,
                  })
                }
              >
                {data.versionGroups.map((vg) => (
                  <option key={vg.name} value={vg.name}>
                    {vg.label}
                  </option>
                ))}
              </select>
            </div>
            {data.methods.map((method) => (
              <MovesTable key={`${data.game}-${method.method}`} label={method.label} levels={method.method === "level-up"} rows={method.rows} />
            ))}
          </>
        )}
      </Section>
    </>
  );
}
