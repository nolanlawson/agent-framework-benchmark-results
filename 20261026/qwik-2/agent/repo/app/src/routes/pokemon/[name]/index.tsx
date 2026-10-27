import { component$ } from "@builder.io/qwik";
import {
  Link,
  routeLoader$,
  useLocation,
  useNavigate,
  type DocumentHead,
} from "@builder.io/qwik-city";
import { MovesTable } from "~/components/moves-table";
import { NotFound } from "~/components/not-found";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import { dexNumber, humanize, pageTitle } from "~/lib/format";
import {
  api,
  english,
  englishName,
  idFromUrl,
  latestFlavorText,
  slug,
  typeLabels,
  typeRef,
  versionGroupOrders,
} from "~/lib/server-api";
import type { EvolutionNode, MoveRow, MoveTableData } from "~/lib/types";

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

function evolutionTree(link: any): EvolutionNode {
  return {
    name: link.species.name,
    label: humanize(link.species.name),
    children: (link.evolves_to ?? []).map(evolutionTree),
  };
}

function methodRank(method: string): number {
  const i = METHOD_ORDER.indexOf(method);
  return i === -1 ? METHOD_ORDER.length : i;
}

async function moveTables(pokemon: any, versionGroup: string): Promise<MoveTableData[]> {
  const learned: { move: string; method: string; level: number }[] = [];
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details ?? []) {
      if (d.version_group.name !== versionGroup) continue;
      learned.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }

  const [labels, moves] = await Promise.all([
    typeLabels(),
    Promise.all([...new Set(learned.map((l) => l.move))].map((name) => api(`move/${name}`))),
  ]);
  const moveByName = new Map(moves.filter(Boolean).map((m: any) => [m.name, m]));

  const tables = new Map<string, MoveRow[]>();
  for (const l of learned) {
    const move = moveByName.get(l.move);
    const rows = tables.get(l.method) ?? [];
    rows.push({
      level: l.method === "level-up" ? l.level : null,
      name: l.move,
      label: move ? englishName(move) : humanize(l.move),
      type: move?.type ? typeRef(labels, move.type.name) : null,
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    });
    tables.set(l.method, rows);
  }

  return [...tables.entries()]
    .map(([method, rows]) => ({ method, label: humanize(method), rows }))
    .sort((a, b) => methodRank(a.method) - methodRank(b.method) || a.label.localeCompare(b.label));
}

export const usePokemon = routeLoader$(async ({ params, query, status }) => {
  const species = await api(`pokemon-species/${slug(params.name)}`);
  const variety = species?.varieties?.find((v: any) => v.is_default) ?? species?.varieties?.[0];
  const pokemon = variety ? await api(`pokemon/${idFromUrl(variety.pokemon.url)}`) : null;
  if (!species || !pokemon) {
    status(404);
    return null;
  }

  const [labels, chain, vgOrders] = await Promise.all([
    typeLabels(),
    species.evolution_chain ? api(`evolution-chain/${idFromUrl(species.evolution_chain.url)}`) : null,
    versionGroupOrders(),
  ]);

  const games = [
    ...new Set<string>(
      (pokemon.moves ?? []).flatMap((m: any) =>
        (m.version_group_details ?? []).map((d: any) => d.version_group.name),
      ),
    ),
  ]
    .sort((a, b) => (vgOrders.get(a) ?? Infinity) - (vgOrders.get(b) ?? Infinity))
    .map((name) => ({ name, label: humanize(name) }));
  const requestedGame = query.get("game");
  const game = games.some((g) => g.name === requestedGame)
    ? requestedGame!
    : (games[games.length - 1]?.name ?? null);

  const stats: { name: string; label: string; value: number }[] = (pokemon.stats ?? []).map((s: any) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  return {
    id: species.id as number,
    name: species.name as string,
    label: englishName(species),
    genus: english(species.genera as { genus: string; language: { name: string } }[])?.genus ?? null,
    types: [...(pokemon.types ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => typeRef(labels, t.type.name)),
    artwork: (pokemon.sprites?.other?.["official-artwork"]?.front_default ??
      pokemon.sprites?.front_default ??
      null) as string | null,
    height: ((pokemon.height ?? 0) / 10).toFixed(1),
    weight: ((pokemon.weight ?? 0) / 10).toFixed(1),
    flavorText: latestFlavorText(species.flavor_text_entries),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name as string, label: humanize(a.ability.name), hidden: !!a.is_hidden })),
    evolution: chain?.chain ? evolutionTree(chain.chain) : { name: species.name, label: humanize(species.name), children: [] },
    games,
    game,
    moveTables: game ? await moveTables(pokemon, game) : [],
  };
});

const EvolutionList = component$<{ nodes: EvolutionNode[] }>(({ nodes }) => (
  <ul>
    {nodes.map((node) => (
      <li key={node.name}>
        <Link href={`/pokemon/${node.name}`}>{node.label}</Link>
        {node.children.length > 0 && <EvolutionList nodes={node.children} />}
      </li>
    ))}
  </ul>
));

const StatBar = component$<{ value: number; max: number }>(({ value, max }) => (
  <div class="stat-track" aria-hidden="true">
    <div class="stat-bar" style={`width: ${Math.min(100, (value / max) * 100).toFixed(2)}%`} />
  </div>
));

export default component$(() => {
  const data = usePokemon();
  const nav = useNavigate();
  const loc = useLocation();
  const p = data.value;
  if (!p) return <NotFound />;

  return (
    <>
      <div class="pokemon-summary">
        <div class="artwork">
          {p.artwork && <img src={p.artwork} alt={p.label} width={475} height={475} />}
        </div>
        <div class="summary-text">
          <p class="dex">{dexNumber(p.id)}</p>
          <h1>{p.label}</h1>
          {p.genus && <p class="genus">{p.genus}</p>}
          <p class="types">
            {p.types.map((t) => (
              <TypeBadge key={t.name} type={t} link />
            ))}
          </p>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{p.height} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{p.weight} kg</dd>
            </div>
          </dl>
          {p.flavorText && <p class="flavor">{p.flavorText}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats-table">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td class="stat-value">{s.value}</td>
                <td class="stat-bar-cell">
                  <StatBar value={s.value} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr class="stat-total">
              <th scope="row">Total</th>
              <td class="stat-value">{p.total}</td>
              <td class="stat-bar-cell">
                <StatBar value={p.total} max={MAX_STAT * Math.max(1, p.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="bullets">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link href={`/abilities/${a.name}`}>{a.label}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <div class="evolution">
          <EvolutionList nodes={[p.evolution]} />
        </div>
      </Section>

      <Section id="moves" title="Moves">
        {p.games.length === 0 ? (
          <p>—</p>
        ) : (
          <>
            <div class="inline-field">
              <label for="game">Game</label>
              <select
                id="game"
                onChange$={(_, el) => {
                  const url = new URL(loc.url);
                  url.searchParams.set("game", el.value);
                  return nav(`${url.pathname}${url.search}`, { replaceState: true, scroll: false });
                }}
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name} selected={g.name === p.game}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {p.moveTables.map((t) => (
              <MovesTable key={`${p.game}-${t.method}`} table={t} />
            ))}
          </>
        )}
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const p = resolveValue(usePokemon);
  return { title: pageTitle(p ? p.label : "Not found") };
};
