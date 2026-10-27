import { Form, Link, useNavigate } from "react-router";
import type { Route } from "./+types/pokemon";
import { MoveTable, type MoveRow } from "~/components/move-table";
import { Section, TypeBadges } from "~/components/ui";
import { get } from "~/lib/api.server";
import {
  english,
  englishName,
  getOr404,
  getTypeLabels,
  latestEnglishFlavorText,
  typeRef,
} from "~/lib/data.server";
import { dexNumber, humanize, pageTitle } from "~/lib/format";

const STAT_LABELS: Record<string, string> = {
  hp: "HP",
  attack: "Attack",
  defense: "Defense",
  "special-attack": "Sp. Atk",
  "special-defense": "Sp. Def",
  speed: "Speed",
};
const METHOD_ORDER = ["level-up", "machine", "egg", "tutor"];

type ChainLink = { species: { name: string }; evolves_to: ChainLink[] };
type Evolution = { name: string; evolvesTo: Evolution[] };

function toEvolution(link: ChainLink): Evolution {
  return { name: link.species.name, evolvesTo: link.evolves_to.map(toEvolution) };
}

function methodRank(method: string) {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const species = await getOr404(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
  const [pokemon, chain, typeLabels] = await Promise.all([
    get(`pokemon/${species.id}`),
    species.evolution_chain ? get(species.evolution_chain.url) : null,
    getTypeLabels(),
  ]);

  // Version groups in which the Pokémon learns moves, by the game's `order`.
  const groupNames = new Set<string>();
  for (const m of pokemon.moves) for (const d of m.version_group_details) groupNames.add(d.version_group.name);
  const groups = (await Promise.all([...groupNames].map((name) => get(`version-group/${name}`)))).sort(
    (a, b) => a.order - b.order,
  );
  const requested = new URL(request.url).searchParams.get("game");
  const game = groups.find((g) => g.name === requested)?.name ?? groups[groups.length - 1]?.name ?? null;

  // Moves learned in the selected game, grouped by learn method.
  const learned: { move: string; method: string; level: number }[] = [];
  for (const m of pokemon.moves) {
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      learned.push({ move: m.move.url, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const moveDetails = new Map(
    await Promise.all([...new Set(learned.map((l) => l.move))].map(async (url) => [url, await get(url)] as const)),
  );
  const methods = new Map<string, MoveRow[]>();
  const seen = new Set<string>();
  for (const { move: url, method, level } of learned) {
    const key = `${method} ${url} ${level}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const move = moveDetails.get(url)!;
    if (!methods.has(method)) methods.set(method, []);
    methods.get(method)!.push({
      level: method === "level-up" ? level : null,
      name: move.name,
      label: englishName(move),
      type: typeRef(move.type.name, typeLabels),
      category: move.damage_class ? humanize(move.damage_class.name) : null,
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
    });
  }
  const moveTables = [...methods.entries()]
    .sort(([a], [b]) => methodRank(a) - methodRank(b) || a.localeCompare(b))
    .map(([method, rows]) => ({ method, label: humanize(method), rows }));

  const artwork = pokemon.sprites?.other?.["official-artwork"]?.front_default ?? pokemon.sprites?.front_default ?? null;

  return {
    id: species.id as number,
    name: englishName(species),
    genus: english(species.genera as { genus: string; language: { name: string } }[])?.genus ?? null,
    flavorText: latestEnglishFlavorText(species.flavor_text_entries) ?? null,
    artwork: artwork as string | null,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    types: [...pokemon.types]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => typeRef(t.type.name, typeLabels)),
    stats: (pokemon.stats as { base_stat: number; stat: { name: string } }[]).map((s) => ({
      name: s.stat.name,
      label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
      value: s.base_stat,
    })),
    abilities: [...pokemon.abilities]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name as string, hidden: a.is_hidden as boolean })),
    evolution: chain ? toEvolution(chain.chain) : { name: species.name, evolvesTo: [] },
    games: groups.map((g) => ({ name: g.name as string, label: humanize(g.name) })),
    game,
    moveTables,
  };
}

function EvolutionList({ items }: { items: Evolution[] }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.name}>
          <Link to={`/pokemon/${item.name}`}>{humanize(item.name)}</Link>
          {item.evolvesTo.length > 0 && <EvolutionList items={item.evolvesTo} />}
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
      <title>{pageTitle(p.name)}</title>
      <div className="pokemon-hero">
        <div className="artwork">{p.artwork && <img src={p.artwork} alt={p.name} width={475} height={475} />}</div>
        <div className="pokemon-summary">
          <p className="dex">{dexNumber(p.id)}</p>
          <h1>{p.name}</h1>
          {p.genus && <p className="genus">{p.genus}</p>}
          <TypeBadges types={p.types} />
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
          {p.flavorText && <p className="flavor">{p.flavorText}</p>}
        </div>
      </div>

      <Section title="Base stats">
        <table className="stats">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td>{s.value}</td>
                <td className="stat-bar-cell" aria-hidden="true">
                  <span className="stat-bar">
                    <span style={{ width: `${Math.min(100, (s.value / 255) * 100)}%` }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="stats-total">
              <th scope="row">Total</th>
              <td>{total}</td>
              <td className="stat-bar-cell" aria-hidden="true">
                <span className="stat-bar">
                  <span style={{ width: `${Math.min(100, (total / (255 * 6)) * 100)}%` }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="Abilities">
        <ul className="abilities">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link to={`/abilities/${a.name}`}>{humanize(a.name)}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Evolution">
        <EvolutionList items={[p.evolution]} />
      </Section>

      <Section title="Moves" id="moves">
        {p.games.length === 0 ? (
          <p>No moves.</p>
        ) : (
          <>
            <Form method="get" className="game-picker">
              <label htmlFor="game">Game</label>
              <select
                id="game"
                name="game"
                value={p.game ?? ""}
                onChange={(event) =>
                  navigate({ search: `?game=${event.target.value}` }, { replace: true, preventScrollReset: true })
                }
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.label}
                  </option>
                ))}
              </select>
              <noscript>
                <button type="submit">Show</button>
              </noscript>
            </Form>
            {p.moveTables.map((t) => (
              <MoveTable key={`${p.game} ${t.method}`} caption={t.label} levels={t.method === "level-up"} rows={t.rows} />
            ))}
          </>
        )}
      </Section>
    </>
  );
}
