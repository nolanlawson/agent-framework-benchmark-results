import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useNavigate, type DocumentHead } from "@builder.io/qwik-city";
import { MovesTable, type MoveRow } from "~/components/moves-table";
import { NotFound } from "~/components/not-found";
import { Section } from "~/components/section";
import { TypeBadge } from "~/components/type-badge";
import {
  api,
  englishName,
  getTypeLabels,
  latestEnglishFlavorText,
  typeRef,
  type NamedRef,
} from "~/lib/api";
import { dexNumber, humanize, pageTitle } from "~/lib/format";

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
  evolvesTo: EvolutionNode[];
}

interface ChainLink {
  species: NamedRef;
  evolves_to: ChainLink[];
}

const toEvolutionNode = (link: ChainLink): EvolutionNode => ({
  name: link.species.name,
  evolvesTo: link.evolves_to.map(toEvolutionNode),
});

interface LearnEntry {
  move: NamedRef;
  version_group_details: {
    level_learned_at: number;
    version_group: NamedRef;
    move_learn_method: NamedRef;
  }[];
}

function methodRank(name: string) {
  const i = METHOD_ORDER.indexOf(name);
  return i === -1 ? METHOD_ORDER.length : i;
}

export const usePokemon = routeLoader$(async ({ params, url, fail }) => {
  const species = await api(`pokemon-species/${encodeURIComponent(params.name.toLowerCase())}`);
  // Only species names are valid URLs (not numeric IDs or form names).
  if (!species || species.name !== params.name.toLowerCase()) return fail(404, { notFound: true as const });

  const defaultVariety =
    species.varieties.find((v: { is_default: boolean }) => v.is_default)?.pokemon ?? {
      url: `pokemon/${species.id}`,
    };
  const [pokemon, chain, typeLabels] = await Promise.all([
    api(defaultVariety.url),
    species.evolution_chain?.url ? api(species.evolution_chain.url) : null,
    getTypeLabels(),
  ]);
  if (!pokemon) return fail(404, { notFound: true as const });

  const name: string = englishName(species.names, species.name);

  // Version groups in which the Pokémon learns moves, ordered by the group's `order`.
  const learnset = pokemon.moves as LearnEntry[];
  const groupNames = [
    ...new Set(learnset.flatMap((m) => m.version_group_details.map((d) => d.version_group.name))),
  ];
  const groupDocs = await Promise.all(groupNames.map((g) => api(`version-group/${g}`)));
  const games = groupNames
    .map((g, i) => ({ name: g, label: humanize(g), order: groupDocs[i]?.order ?? 0 }))
    .sort((a, b) => a.order - b.order);
  const requestedGame = url.searchParams.get("game");
  const game = games.find((g) => g.name === requestedGame)?.name ?? games[games.length - 1]?.name ?? "";

  // Moves learned in the selected version group, grouped by learn method.
  const learned = learnset.flatMap((m) =>
    m.version_group_details
      .filter((d) => d.version_group.name === game)
      .map((d) => ({ move: m.move, method: d.move_learn_method.name, level: d.level_learned_at })),
  );
  const moveDocs = new Map<string, any>();
  await Promise.all(
    [...new Set(learned.map((l) => l.move.name))].map(async (moveName) => {
      moveDocs.set(moveName, await api(`move/${moveName}`));
    }),
  );
  const tables = new Map<string, MoveRow[]>();
  const seen = new Set<string>();
  for (const { move, method, level } of learned) {
    const key = `${method}|${move.name}|${method === "level-up" ? level : ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const doc = moveDocs.get(move.name);
    const typeName: string | undefined = doc?.type?.name;
    const rows = tables.get(method) ?? [];
    rows.push({
      level: method === "level-up" ? level : null,
      name: move.name,
      label: englishName(doc?.names, move.name),
      type: typeName ? typeRef(typeLabels, typeName) : null,
      category: doc?.damage_class?.name ? humanize(doc.damage_class.name) : null,
      power: doc?.power ?? null,
      accuracy: doc?.accuracy ?? null,
      pp: doc?.pp ?? null,
    });
    tables.set(method, rows);
  }
  const moveTables = [...tables.entries()]
    .sort(
      ([a], [b]) => methodRank(a) - methodRank(b) || humanize(a).localeCompare(humanize(b)),
    )
    .map(([method, rows]) => ({ method, label: humanize(method), rows }));

  const stats = (pokemon.stats as { base_stat: number; stat: NamedRef }[]).map((s) => ({
    name: s.stat.name,
    label: STAT_LABELS[s.stat.name] ?? humanize(s.stat.name),
    value: s.base_stat,
  }));

  return {
    notFound: false as const,
    id: species.id as number,
    speciesName: species.name as string,
    name,
    genus:
      (species.genera as { genus: string; language: NamedRef }[]).find(
        (g) => g.language.name === "en",
      )?.genus ?? "",
    flavorText: latestEnglishFlavorText(species.flavor_text_entries),
    types: (pokemon.types as { slot: number; type: NamedRef }[])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((t) => typeRef(typeLabels, t.type.name)),
    artwork:
      (pokemon.sprites?.other?.["official-artwork"]?.front_default as string | null) ??
      (pokemon.sprites?.front_default as string | null) ??
      null,
    height: (pokemon.height / 10).toFixed(1),
    weight: (pokemon.weight / 10).toFixed(1),
    stats,
    total: stats.reduce((sum, s) => sum + s.value, 0),
    abilities: (pokemon.abilities as { slot: number; is_hidden: boolean; ability: NamedRef }[])
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .map((a) => ({ name: a.ability.name, hidden: a.is_hidden })),
    evolution: chain?.chain
      ? toEvolutionNode(chain.chain)
      : { name: species.name as string, evolvesTo: [] },
    games: games.map(({ name, label }) => ({ name, label })),
    game,
    moveTables,
  };
});

const EvolutionTree = component$<{ nodes: EvolutionNode[] }>(({ nodes }) => (
  <ul>
    {nodes.map((node) => (
      <li key={node.name}>
        <Link href={`/pokemon/${node.name}`}>{humanize(node.name)}</Link>
        {node.evolvesTo.length > 0 && <EvolutionTree nodes={node.evolvesTo} />}
      </li>
    ))}
  </ul>
));

const StatBar = ({ value, max }: { value: number; max: number }) => (
  <div class="stat-bar" aria-hidden="true">
    <div class="stat-bar-fill" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
  </div>
);

export default component$(() => {
  const data = usePokemon();
  const nav = useNavigate();
  const p = data.value;
  if (p.notFound) return <NotFound />;

  return (
    <>
      <div class="summary">
        <div class="artwork">
          {p.artwork && <img src={p.artwork} alt={p.name} width={475} height={475} />}
        </div>
        <div class="summary-info">
          <p class="dex">{dexNumber(p.id)}</p>
          <h1>{p.name}</h1>
          {p.genus && <p class="genus">{p.genus}</p>}
          <p class="badges">
            {p.types.map((t) => (
              <TypeBadge key={t.name} type={t} />
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
        <table class="stats">
          <tbody>
            {p.stats.map((s) => (
              <tr key={s.name}>
                <th scope="row">{s.label}</th>
                <td>{s.value}</td>
                <td class="stat-bar-cell">
                  <StatBar value={s.value} max={MAX_STAT} />
                </td>
              </tr>
            ))}
            <tr class="stats-total">
              <th scope="row">Total</th>
              <td>{p.total}</td>
              <td class="stat-bar-cell">
                <StatBar value={p.total} max={MAX_STAT * Math.max(1, p.stats.length)} />
              </td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section id="abilities" title="Abilities">
        <ul>
          {p.abilities.map((a) => (
            <li key={a.name}>
              <Link href={`/abilities/${a.name}`}>{humanize(a.name)}</Link>
              {a.hidden && " (hidden)"}
            </li>
          ))}
        </ul>
      </Section>

      <Section id="evolution" title="Evolution">
        <div class="evolution">
          <EvolutionTree nodes={[p.evolution]} />
        </div>
      </Section>

      <Section id="moves-section" anchor="moves" title="Moves">
        {p.games.length === 0 ? (
          <p>—</p>
        ) : (
          <>
            <div class="game-picker">
              <label for="game">Game</label>
              <select
                id="game"
                name="game"
                onChange$={(_, el) =>
                  nav(`/pokemon/${p.speciesName}?game=${encodeURIComponent(el.value)}`, {
                    scroll: false,
                    replaceState: true,
                  })
                }
              >
                {p.games.map((g) => (
                  <option key={g.name} value={g.name} selected={g.name === p.game}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            {p.moveTables.map((t) => (
              <MovesTable
                key={`${p.game}-${t.method}`}
                caption={t.label}
                showLevel={t.method === "level-up"}
                rows={t.rows}
              />
            ))}
          </>
        )}
      </Section>
    </>
  );
});

export const head: DocumentHead = ({ resolveValue }) => {
  const data = resolveValue(usePokemon);
  return { title: pageTitle(data.notFound ? "Not found" : data.name) };
};
