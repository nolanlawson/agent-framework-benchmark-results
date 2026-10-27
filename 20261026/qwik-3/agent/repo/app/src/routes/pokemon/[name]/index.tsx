import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { MovesTable, type MoveRow } from "~/components/moves-table";
import { NotFound } from "~/components/not-found";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import { api, apiPath, typeLabels } from "~/lib/api";
import { dexNumber, englishEntry, englishName, humanize, latestFlavorText, title, type NamedRef } from "~/lib/format";

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

interface EvolutionNode {
  name: string;
  children: EvolutionNode[];
}

const toEvolutionNode = (link: any): EvolutionNode => ({
  name: link.species.name,
  children: (link.evolves_to ?? []).map(toEvolutionNode),
});

export const usePokemon = routeLoader$(async ({ params, url, status }) => {
  const species = await api(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
  if (!species) {
    status(404);
    return null;
  }
  const variety = species.varieties?.find((v: any) => v.is_default) ?? species.varieties?.[0];
  const [pokemon, chain, labels] = await Promise.all([
    variety ? api(apiPath(variety.pokemon.url)) : api(`pokemon/${species.id}`),
    species.evolution_chain ? api(apiPath(species.evolution_chain.url)) : null,
    typeLabels(),
  ]);
  if (!pokemon) {
    status(404);
    return null;
  }

  // Version groups in which the Pokémon learns moves, by the group's order.
  const groupNames = new Set<string>();
  for (const m of pokemon.moves ?? []) {
    for (const d of m.version_group_details) groupNames.add(d.version_group.name);
  }
  const groups = (
    await Promise.all(
      [...groupNames].map(async (name) => {
        const group = await api(`version-group/${name}`);
        return { name, label: humanize(name), order: group?.order ?? Number.MAX_SAFE_INTEGER };
      }),
    )
  ).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const requestedGame = url.searchParams.get("game");
  const game = groups.find((g) => g.name === requestedGame)?.name ?? groups.at(-1)?.name ?? null;

  const learned: { move: string; method: string; level: number }[] = [];
  for (const m of pokemon.moves ?? []) {
    const seen = new Set<string>();
    for (const d of m.version_group_details) {
      if (d.version_group.name !== game) continue;
      const key = `${d.move_learn_method.name}:${d.level_learned_at}`;
      if (seen.has(key)) continue;
      seen.add(key);
      learned.push({ move: m.move.name, method: d.move_learn_method.name, level: d.level_learned_at });
    }
  }
  const moveDetails = new Map(
    await Promise.all(
      [...new Set(learned.map((l) => l.move))].map(async (name) => [name, await api(`move/${name}`)] as const),
    ),
  );
  const byMethod = new Map<string, MoveRow[]>();
  for (const l of learned) {
    const move = moveDetails.get(l.move);
    const type = move?.type?.name ?? "unknown";
    const row: MoveRow = {
      level: l.method === "level-up" ? l.level : null,
      name: l.move,
      label: move ? englishName(move) : humanize(l.move),
      type,
      typeLabel: labels.get(type) ?? humanize(type),
      category: move?.damage_class ? humanize(move.damage_class.name) : null,
      power: move?.power ?? null,
      accuracy: move?.accuracy ?? null,
      pp: move?.pp ?? null,
    };
    byMethod.set(l.method, [...(byMethod.get(l.method) ?? []), row]);
  }
  const rank = (m: string) => (METHOD_ORDER.includes(m) ? METHOD_ORDER.indexOf(m) : METHOD_ORDER.length);
  const moveTables = [...byMethod.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || humanize(a).localeCompare(humanize(b)))
    .map(([method, rows]) => ({ method, label: humanize(method), rows }));

  const stats = (pokemon.stats ?? []).map((s: any) => ({
    name: s.stat.name as string,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat as number,
  }));

  return {
    id: species.id as number,
    name: species.name as string,
    label: englishName(species),
    genus: englishEntry<{ genus: string; language: NamedRef }>(species.genera)?.genus ?? null,
    flavor: latestFlavorText(species.flavor_text_entries) ?? null,
    artwork:
      pokemon.sprites?.other?.["official-artwork"]?.front_default ?? (pokemon.sprites?.front_default as string | null),
    height: pokemon.height as number,
    weight: pokemon.weight as number,
    types: [...(pokemon.types ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((t: any) => ({ name: t.type.name as string, label: labels.get(t.type.name) ?? humanize(t.type.name) })),
    stats,
    total: stats.reduce((sum: number, s: { value: number }) => sum + s.value, 0),
    abilities: [...(pokemon.abilities ?? [])]
      .sort((a: any, b: any) => a.slot - b.slot)
      .map((a: any) => ({ name: a.ability.name as string, hidden: Boolean(a.is_hidden) })),
    evolution: chain ? toEvolutionNode(chain.chain) : { name: species.name, children: [] },
    groups: groups.map(({ name, label }) => ({ name, label })),
    game,
    moveTables,
  };
});

const EvolutionTree = component$<{ node: EvolutionNode }>(({ node }) => (
  <li>
    <Link href={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
    {node.children.length > 0 && (
      <ul>
        {node.children.map((child) => (
          <EvolutionTree key={child.name} node={child} />
        ))}
      </ul>
    )}
  </li>
));

const statWidth = (value: number, max: number) => `${Math.min(100, (value / max) * 100).toFixed(1)}%`;

export default component$(() => {
  const data = usePokemon();
  const nav = useNavigate();
  const loc = useLocation();
  const p = data.value;
  if (!p) return <NotFound />;

  return (
    <>
      <div class="summary">
        <div class="summary__art">
          {p.artwork && <img src={p.artwork} alt={p.label} width={475} height={475} />}
        </div>
        <div class="summary__info">
          <p class="muted summary__dex">{dexNumber(p.id)}</p>
          <h1>{p.label}</h1>
          {p.genus && <p class="muted summary__genus">{p.genus}</p>}
          <ul class="badge-list" aria-label="Types">
            {p.types.map((t) => (
              <li key={t.name}>
                <TypeBadge name={t.name} label={t.label} link />
              </li>
            ))}
          </ul>
          <dl class="facts">
            <div>
              <dt>Height</dt>
              <dd>{(p.height / 10).toFixed(1)} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{(p.weight / 10).toFixed(1)} kg</dd>
            </div>
          </dl>
          {p.flavor && <p class="summary__flavor">{p.flavor}</p>}
        </div>
      </div>

      <Section id="stats" title="Base stats">
        <table class="stats-table">
          <tbody>
            {p.stats.map((s: { name: string; label: string; value: number }) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td class="stats-table__value">{s.value}</td>
                <td class="stats-table__bar" aria-hidden="true">
                  <span class="stat-bar">
                    <span style={{ width: statWidth(s.value, MAX_STAT) }} />
                  </span>
                </td>
              </tr>
            ))}
            <tr class="stats-table__total">
              <th scope="row">Total</th>
              <td class="stats-table__value">{p.total}</td>
              <td class="stats-table__bar" aria-hidden="true">
                <span class="stat-bar">
                  <span style={{ width: statWidth(p.total, MAX_STAT * Math.max(1, p.stats.length)) }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul class="plain-bullets">
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link href={`/abilities/${a.name}`}>{humanize(a.name)}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <ul class="evolution">
          <EvolutionTree node={p.evolution} />
        </ul>
      </Section>

      <Section id="moves" title="Moves">
        {p.groups.length === 0 ? (
          <p class="muted">No moves.</p>
        ) : (
          <>
            <form class="game-picker" method="get" preventdefault:submit>
              <label for="game">Game</label>
              <select
                id="game"
                name="game"
                onChange$={(_, el) => {
                  const next = new URL(loc.url);
                  next.searchParams.set("game", el.value);
                  next.hash = "";
                  return nav(`${next.pathname}${next.search}`, { replaceState: true, scroll: false });
                }}
              >
                {p.groups.map((g) => (
                  <option key={g.name} value={g.name} selected={g.name === p.game}>
                    {g.label}
                  </option>
                ))}
              </select>
            </form>
            {p.moveTables.map((t) => (
              <MovesTable
                key={`${p.game}-${t.method}`}
                id={`moves-${t.method}`}
                caption={t.label}
                rows={t.rows}
                showLevel={t.method === "level-up"}
              />
            ))}
          </>
        )}
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const p = resolveValue(usePokemon);
  return { title: title(p ? p.label : "Not found") };
};
